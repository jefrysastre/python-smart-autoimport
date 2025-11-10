# Python Smart Auto-Import

Automatically imports Python symbols when there's only one unambiguous import option available. Save time and reduce friction in your Python development workflow!

## Features

✨ **Smart Auto-Import on Save**: When you save a Python file, the extension automatically detects undefined symbols and imports them if there's exactly one clear option.

🎯 **Unambiguous Only**: Only imports when there's a single import option, avoiding confusion and ensuring you stay in control.

📝 **Auto-Import Tracking**: Adds a `# auto-imported` comment to help you track which imports were added automatically.

### How It Works

1. Write your Python code using classes, functions, or variables
2. Save the file (`Ctrl+S` / `Cmd+S`)
3. If a symbol is undefined and has exactly one import option, it's automatically imported
4. The import is added at the top of your file with a `# auto-imported` comment

## Example

**Before saving:**
```python
from myproject.utils import helper_function

def main():
    data = [1, 2, 3, 4, 5]
    result = calculate_mean(data)  # calculate_mean is not defined
    print(result)
```

**After saving (if `calculate_mean` exists in your project):**
```python
from myproject.utils import helper_function
from myproject.math_utils import calculate_mean  # auto-imported

def main():
    data = [1, 2, 3, 4, 5]
    result = calculate_mean(data)
    print(result)
```

> **Note**: The extension relies on the Python language server's code action suggestions. It works best with direct function/class names, not aliased imports like `np` for `numpy`.

## Requirements

- **Python Extension**: This extension requires the official Python extension for VS Code to function properly
- **Python Environment**: A configured Python environment with the packages you want to import

## Extension Settings

This extension contributes the following settings:

* `pythonSmartAutoImport.enabled`: Enable/disable automatic imports (default: `true`)
* `pythonSmartAutoImport.onlyOwnCode`: Only auto-import from your own project files, not external packages (default: `false`)

### How `onlyOwnCode` Detection Works

When enabled, the extension intelligently distinguishes between your own code and external packages by:

1. ✅ **Accepting relative imports**: `from .module import func`
2. ✅ **Checking if module files exist in your workspace**: Searches for `.py` files and packages
3. ✅ **Matching workspace/project names**: Imports matching your project name
4. ✅ **Checking project configuration**: Looks at `setup.py` and `pyproject.toml`
5. ❌ **Rejecting Python standard library**: Complete list of stdlib modules (os, sys, json, etc.)
6. ❌ **Rejecting external packages not found in workspace**: If the module doesn't exist as a file in your project

You can configure the extension via settings:
```json
{
  "pythonSmartAutoImport.enabled": true,
  "pythonSmartAutoImport.onlyOwnCode": true
}
```

## Usage Tips

- Works best with a properly configured Python environment
- Only triggers on save, so you maintain full control
- If multiple import options exist, no automatic import is performed (you'll need to import manually)
- The `# auto-imported` comment helps you identify which imports were added automatically
- **New**: Enable `onlyOwnCode` to restrict auto-imports to your project files only (relative imports and local modules)

## Known Issues

- Extension waits for Python language server diagnostics, which may have a slight delay
- Only works for symbols detected by the Python language server's diagnostic system

## Release Notes

### 0.0.1

Initial release of Python Smart Auto-Import
- Automatic import detection on save
- Single-option import resolution
- Auto-import comment tracking

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
