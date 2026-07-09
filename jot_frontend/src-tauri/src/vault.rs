use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFile {
    pub rel_path: String,
    pub content: String,
}

#[derive(Serialize)]
pub struct VaultScanResult {
    pub files: Vec<VaultFile>,
    pub dirs: Vec<String>,
}

// Rejects `..`/absolute components so a joined path can never land outside
// `vault_path` — cheaper and more correct than canonicalizing, which fails
// outright for the not-yet-existing destinations write/rename/create need.
fn safe_join(vault_path: &str, rel_path: &str) -> Result<PathBuf, String> {
    let rel = Path::new(rel_path);
    if rel.is_absolute()
        || rel
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::Prefix(_)))
    {
        return Err(format!("invalid relative path: {rel_path}"));
    }
    Ok(Path::new(vault_path).join(rel))
}

fn to_rel_string(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn walk(
    root: &Path,
    dir: &Path,
    files: &mut Vec<VaultFile>,
    dirs: &mut Vec<String>,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();
        // Skip dotfiles/dotdirs (.git, .DS_Store, .obsidian-style config dirs, …)
        // so OS/VCS clutter never surfaces as a note or folder in the app.
        if name.starts_with('.') {
            continue;
        }
        if path.is_dir() {
            dirs.push(to_rel_string(root, &path));
            walk(root, &path, files, dirs)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            files.push(VaultFile {
                rel_path: to_rel_string(root, &path),
                content,
            });
        }
    }
    Ok(())
}

#[tauri::command]
pub fn read_vault(vault_path: String) -> Result<VaultScanResult, String> {
    let root = Path::new(&vault_path);
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    let mut dirs = Vec::new();
    walk(root, root, &mut files, &mut dirs)?;
    Ok(VaultScanResult { files, dirs })
}

#[tauri::command]
pub fn write_note(vault_path: String, rel_path: String, content: String) -> Result<(), String> {
    let target = safe_join(&vault_path, &rel_path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(target, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_path(
    vault_path: String,
    old_rel_path: String,
    new_rel_path: String,
) -> Result<(), String> {
    let old_path = safe_join(&vault_path, &old_rel_path)?;
    let new_path = safe_join(&vault_path, &new_rel_path)?;
    if let Some(parent) = new_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_path(vault_path: String, rel_path: String, is_dir: bool) -> Result<(), String> {
    let target = safe_join(&vault_path, &rel_path)?;
    if is_dir {
        fs::remove_dir_all(target).map_err(|e| e.to_string())
    } else {
        fs::remove_file(target).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn create_dir(vault_path: String, rel_path: String) -> Result<(), String> {
    let target = safe_join(&vault_path, &rel_path)?;
    fs::create_dir_all(target).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file(vault_path: String, rel_path: String) -> Result<String, String> {
    let target = safe_join(&vault_path, &rel_path)?;
    fs::read_to_string(target).map_err(|e| e.to_string())
}

// Non-recursive filename listing (no directory-vs-file distinction, no
// dotfile filtering — callers control what lives under `rel_path`).
// Missing directory is not an error: an empty result just means "no entries
// yet", which is the common case for a note's version folder before its
// first snapshot.
#[tauri::command]
pub fn list_dir(vault_path: String, rel_path: String) -> Result<Vec<String>, String> {
    let target = safe_join(&vault_path, &rel_path)?;
    if !target.exists() {
        return Ok(Vec::new());
    }
    let mut names = Vec::new();
    for entry in fs::read_dir(target).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        names.push(entry.file_name().to_string_lossy().to_string());
    }
    Ok(names)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn scratch_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("jot_vault_test_{name}_{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_read_round_trip() {
        let dir = scratch_dir("roundtrip");
        let vault_path = dir.to_string_lossy().to_string();

        write_note(vault_path.clone(), "Note One.md".into(), "---\nid: abc\n---\nHello".into())
            .unwrap();
        write_note(vault_path.clone(), "Sub/Nested Note.md".into(), "body".into()).unwrap();

        let scan = read_vault(vault_path.clone()).unwrap();
        assert_eq!(scan.files.len(), 2);
        assert!(scan.dirs.contains(&"Sub".to_string()));
        let note = scan.files.iter().find(|f| f.rel_path == "Note One.md").unwrap();
        assert_eq!(note.content, "---\nid: abc\n---\nHello");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rename_moves_file_and_creates_parent() {
        let dir = scratch_dir("rename");
        let vault_path = dir.to_string_lossy().to_string();
        write_note(vault_path.clone(), "Old.md".into(), "content".into()).unwrap();
        rename_path(vault_path.clone(), "Old.md".into(), "NewFolder/New.md".into()).unwrap();

        let scan = read_vault(vault_path.clone()).unwrap();
        assert_eq!(scan.files.len(), 1);
        assert_eq!(scan.files[0].rel_path, "NewFolder/New.md");
        assert_eq!(scan.files[0].content, "content");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rename_directory_moves_all_descendants() {
        let dir = scratch_dir("dirrename");
        let vault_path = dir.to_string_lossy().to_string();
        write_note(vault_path.clone(), "Work/A.md".into(), "a".into()).unwrap();
        write_note(vault_path.clone(), "Work/Sub/B.md".into(), "b".into()).unwrap();

        rename_path(vault_path.clone(), "Work".into(), "Projects".into()).unwrap();

        let scan = read_vault(vault_path.clone()).unwrap();
        let paths: Vec<_> = scan.files.iter().map(|f| f.rel_path.clone()).collect();
        assert!(paths.contains(&"Projects/A.md".to_string()));
        assert!(paths.contains(&"Projects/Sub/B.md".to_string()));
        assert!(scan.dirs.contains(&"Projects".to_string()));
        assert!(scan.dirs.contains(&"Projects/Sub".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_file_and_delete_dir_recursive() {
        let dir = scratch_dir("delete");
        let vault_path = dir.to_string_lossy().to_string();
        write_note(vault_path.clone(), "A.md".into(), "a".into()).unwrap();
        write_note(vault_path.clone(), "Folder/B.md".into(), "b".into()).unwrap();

        delete_path(vault_path.clone(), "A.md".into(), false).unwrap();
        delete_path(vault_path.clone(), "Folder".into(), true).unwrap();

        let scan = read_vault(vault_path.clone()).unwrap();
        assert_eq!(scan.files.len(), 0);
        assert_eq!(scan.dirs.len(), 0);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_dir_is_idempotent_and_nested() {
        let dir = scratch_dir("createdir");
        let vault_path = dir.to_string_lossy().to_string();
        create_dir(vault_path.clone(), "A/B/C".into()).unwrap();
        create_dir(vault_path.clone(), "A/B/C".into()).unwrap(); // no error on existing dir

        let scan = read_vault(vault_path.clone()).unwrap();
        assert!(scan.dirs.contains(&"A".to_string()));
        assert!(scan.dirs.contains(&"A/B".to_string()));
        assert!(scan.dirs.contains(&"A/B/C".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn hidden_entries_are_skipped() {
        let dir = scratch_dir("hidden");
        let vault_path = dir.to_string_lossy().to_string();
        write_note(vault_path.clone(), "Visible.md".into(), "v".into()).unwrap();
        fs::create_dir_all(dir.join(".git")).unwrap();
        fs::write(dir.join(".DS_Store"), "junk").unwrap();

        let scan = read_vault(vault_path.clone()).unwrap();
        assert_eq!(scan.files.len(), 1);
        assert_eq!(scan.dirs.len(), 0);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_file_reads_single_file() {
        let dir = scratch_dir("readfile");
        let vault_path = dir.to_string_lossy().to_string();
        write_note(vault_path.clone(), "Note.md".into(), "hello world".into()).unwrap();

        let content = read_file(vault_path, "Note.md".into()).unwrap();
        assert_eq!(content, "hello world");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_dir_lists_filenames_and_tolerates_missing_dir() {
        let dir = scratch_dir("listdir");
        let vault_path = dir.to_string_lossy().to_string();
        write_note(vault_path.clone(), ".jot/versions/abc/one.md".into(), "1".into()).unwrap();
        write_note(vault_path.clone(), ".jot/versions/abc/two.md".into(), "2".into()).unwrap();

        let mut names = list_dir(vault_path.clone(), ".jot/versions/abc".into()).unwrap();
        names.sort();
        assert_eq!(names, vec!["one.md".to_string(), "two.md".to_string()]);

        let missing = list_dir(vault_path, ".jot/versions/does-not-exist".into()).unwrap();
        assert!(missing.is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn safe_join_rejects_traversal() {
        assert!(safe_join("/vault", "../escape.md").is_err());
        assert!(safe_join("/vault", "/etc/passwd").is_err());
        assert!(safe_join("/vault", "ok/nested.md").is_ok());
    }
}
