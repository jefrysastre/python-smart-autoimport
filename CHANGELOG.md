# Change Log

All notable changes to the "python-smart-autoimport" extension will be documented in this file.

## [0.0.2] - 2025-11-07

### Added
- New setting `pythonSmartAutoImport.onlyOwnCode` to restrict auto-imports to your own project files only
- Smart detection algorithm that distinguishes between own code and external packages
- File system checks to verify if modules exist in workspace
- Python standard library detection (140+ modules)
- Project configuration checks (setup.py, pyproject.toml)

### Improved
- Better import filtering logic with comprehensive detection
- Documentation with detailed explanation of detection algorithm

## [0.0.1] - 2025-11-07

### Added
- Initial release
- Automatic Python import detection on file save
- Smart import resolution when only one option is available
- Auto-import comment tracking (`# auto-imported`)
- Configuration option to enable/disable auto-imports
- Support for both `from X import Y` and `import X` patterns
