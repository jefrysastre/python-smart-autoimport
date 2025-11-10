import * as vscode from 'vscode';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('Python Smart Auto-Import');
	outputChannel.appendLine('Python Smart Auto-Import extension activated!');
	outputChannel.appendLine(`Version: ${context.extension.packageJSON.version}`);
	outputChannel.appendLine('---');

	// Run on document save
	const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
		outputChannel.appendLine(`\n[${new Date().toLocaleTimeString()}] Document saved: ${document.fileName}`);

		if (document.languageId !== 'python') {
			outputChannel.appendLine(`Skipped: Not a Python file (language: ${document.languageId})`);
			return;
		}

		const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
		const enabled = config.get('enabled');

		if (!enabled) {
			outputChannel.appendLine('Skipped: Extension is disabled in settings');
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
			outputChannel.appendLine('Skipped: Document is not in active editor');
			return;
		}

		outputChannel.appendLine('Processing auto-imports...');
		await autoImportMissingSymbols(editor);
	});

	context.subscriptions.push(onSaveDisposable);
	context.subscriptions.push(outputChannel);
}

async function autoImportMissingSymbols(editor: vscode.TextEditor) {
	const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
	outputChannel.appendLine(`Found ${diagnostics.length} diagnostic(s) from language server`);

	const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
	const onlyOwnCode = config.get<boolean>('onlyOwnCode', false);
	outputChannel.appendLine(`Settings: onlyOwnCode=${onlyOwnCode}`);

	let processedCount = 0;
	let importedCount = 0;

	for (const diagnostic of diagnostics) {
		if (diagnostic.message.includes('is not defined')) {
			processedCount++;
			outputChannel.appendLine(`\nProcessing: "${diagnostic.message}"`);

			const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
				'vscode.executeCodeActionProvider',
				editor.document.uri,
				diagnostic.range
			);

			if (!codeActions) {
				outputChannel.appendLine('  No code actions available');
				continue;
			}

			let importActions = codeActions.filter(action =>
				action.title.toLowerCase().includes('import')
			);

			outputChannel.appendLine(`  Found ${importActions.length} import action(s)`);
			if (importActions.length > 0) {
				importActions.forEach(action => {
					outputChannel.appendLine(`    - ${action.title}`);
				});
			}

			// Filter to only own code if setting is enabled
			if (onlyOwnCode) {
				const beforeFilter = importActions.length;
				importActions = importActions.filter(action => isOwnCodeImport(action, editor));
				outputChannel.appendLine(`  After onlyOwnCode filter: ${importActions.length} action(s) (filtered out ${beforeFilter - importActions.length})`);
			}

			// Only auto-import if there's exactly ONE option
			if (importActions.length === 1 && importActions[0].edit) {
				outputChannel.appendLine(`  ✓ Auto-importing: ${importActions[0].title}`);
				await vscode.workspace.applyEdit(importActions[0].edit);
				importedCount++;

				// Wait for document to update
				await new Promise(resolve => setTimeout(resolve, 100));

				// Re-get the document after edit
				const document = editor.document;
				const text = document.getText();
				const lines = text.split('\n');

				let lastImportLine = -1;
				for (let i = 0; i < lines.length; i++) {
					const trimmedLine = lines[i].trim();
					if (trimmedLine.startsWith('from ') || trimmedLine.startsWith('import ')) {
						lastImportLine = i;
					} else if (trimmedLine !== '' && !trimmedLine.startsWith('#') && lastImportLine !== -1) {
						break;
					}
				}

				if (lastImportLine !== -1) {
					const edit = new vscode.WorkspaceEdit();
					const position = new vscode.Position(lastImportLine, lines[lastImportLine].length);
					edit.insert(document.uri, position, '  # auto-imported');
					await vscode.workspace.applyEdit(edit);
					outputChannel.appendLine('  Added "# auto-imported" comment');
				}
			} else if (importActions.length === 0) {
				outputChannel.appendLine('  ✗ Skipped: No import options available');
			} else if (importActions.length > 1) {
				outputChannel.appendLine(`  ✗ Skipped: Multiple import options (${importActions.length}), ambiguous`);
			}
		}
	}

	outputChannel.appendLine(`\nSummary: Processed ${processedCount} undefined symbol(s), imported ${importedCount}`);
}

function isOwnCodeImport(action: vscode.CodeAction, editor: vscode.TextEditor): boolean {
	// Check if the import is from a relative path (own code)
	const title = action.title.toLowerCase();

	// If it's a relative import (from .xxx import yyy)
	if (title.includes('from .')) {
		outputChannel.appendLine(`    → Accepted: Relative import detected`);
		return true;
	}

	// Extract the import statement from the action
	const edit = action.edit;
	if (!edit) {
		outputChannel.appendLine(`    → Rejected: No edit available`);
		return false;
	}

	// Get the workspace folder
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
	if (!workspaceFolder) {
		outputChannel.appendLine(`    → Rejected: No workspace folder found`);
		return false;
	}

	// Check if the edit contains relative imports or local module paths
	for (const [uri, edits] of edit.entries()) {
		for (const textEdit of edits) {
			const text = textEdit.newText;

			// Relative imports (from .xxx or from ..xxx)
			if (text.includes('from .')) {
				outputChannel.appendLine(`    → Accepted: Relative import in edit text`);
				return true;
			}

			// Extract module name from "from xxx import" or "import xxx"
			const fromMatch = text.match(/from\s+([^\s]+)\s+import/);
			const importMatch = text.match(/import\s+([^\s]+)/);
			const moduleName = fromMatch ? fromMatch[1] : importMatch ? importMatch[1] : null;

			if (moduleName) {
				const result = isLocalModule(moduleName, workspaceFolder, editor);
				outputChannel.appendLine(`    → ${result ? 'Accepted' : 'Rejected'}: Module "${moduleName}" ${result ? 'is' : 'is not'} local`);
				return result;
			}
		}
	}

	outputChannel.appendLine(`    → Rejected: No module name found in import`);
	return false;
}

function isLocalModule(moduleName: string, workspaceFolder: vscode.WorkspaceFolder, editor: vscode.TextEditor): boolean {
	// Python standard library modules (comprehensive list)
	const stdlibModules = new Set([
		'abc', 'aifc', 'argparse', 'array', 'ast', 'asyncio', 'atexit', 'audioop', 'base64', 'bdb', 'binascii',
		'binhex', 'bisect', 'builtins', 'bz2', 'calendar', 'cgi', 'cgitb', 'chunk', 'cmath', 'cmd', 'code',
		'codecs', 'codeop', 'collections', 'colorsys', 'compileall', 'concurrent', 'configparser', 'contextlib',
		'contextvars', 'copy', 'copyreg', 'crypt', 'csv', 'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm',
		'decimal', 'difflib', 'dis', 'distutils', 'doctest', 'email', 'encodings', 'enum', 'errno', 'faulthandler',
		'fcntl', 'filecmp', 'fileinput', 'fnmatch', 'fractions', 'ftplib', 'functools', 'gc', 'getopt', 'getpass',
		'gettext', 'glob', 'graphlib', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac', 'html', 'http', 'imaplib',
		'imghdr', 'imp', 'importlib', 'inspect', 'io', 'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3',
		'linecache', 'locale', 'logging', 'lzma', 'mailbox', 'mailcap', 'marshal', 'math', 'mimetypes', 'mmap',
		'modulefinder', 'msilib', 'msvcrt', 'multiprocessing', 'netrc', 'nis', 'nntplib', 'numbers', 'operator',
		'optparse', 'os', 'ossaudiodev', 'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil', 'platform',
		'plistlib', 'poplib', 'posix', 'posixpath', 'pprint', 'profile', 'pstats', 'pty', 'pwd', 'py_compile',
		'pyclbr', 'pydoc', 'queue', 'quopri', 'random', 're', 'readline', 'reprlib', 'resource', 'rlcompleter',
		'runpy', 'sched', 'secrets', 'select', 'selectors', 'shelve', 'shlex', 'shutil', 'signal', 'site',
		'smtpd', 'smtplib', 'sndhdr', 'socket', 'socketserver', 'spwd', 'sqlite3', 'ssl', 'stat', 'statistics',
		'string', 'stringprep', 'struct', 'subprocess', 'sunau', 'symtable', 'sys', 'sysconfig', 'syslog',
		'tabnanny', 'tarfile', 'telnetlib', 'tempfile', 'termios', 'test', 'textwrap', 'threading', 'time',
		'timeit', 'tkinter', 'token', 'tokenize', 'tomllib', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle',
		'turtledemo', 'types', 'typing', 'unicodedata', 'unittest', 'urllib', 'uu', 'uuid', 'venv', 'warnings',
		'wave', 'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref', 'xdrlib', 'xml', 'xmlrpc', 'zipapp',
		'zipfile', 'zipimport', 'zlib', '_thread'
	]);

	// Get the base module name (first part before any dots)
	const baseModule = moduleName.split('.')[0];

	// Check if it's a Python standard library module
	if (stdlibModules.has(baseModule)) {
		return false;
	}

	// Check if it's a common third-party package
	// This is a heuristic: if the module contains underscores or is lowercase-only
	// and doesn't exist in workspace, it's likely external
	const fs = require('fs');
	const currentDir = path.dirname(editor.document.uri.fsPath);
	const workspacePath = workspaceFolder.uri.fsPath;

	// Try to find the module as a file in the workspace
	const possiblePaths = [
		// Relative to current file
		path.join(currentDir, `${baseModule}.py`),
		path.join(currentDir, baseModule, '__init__.py'),
		// Relative to workspace root
		path.join(workspacePath, `${baseModule}.py`),
		path.join(workspacePath, baseModule, '__init__.py'),
		// Check for common source directories
		path.join(workspacePath, 'src', `${baseModule}.py`),
		path.join(workspacePath, 'src', baseModule, '__init__.py'),
		path.join(workspacePath, 'lib', `${baseModule}.py`),
		path.join(workspacePath, 'lib', baseModule, '__init__.py'),
	];

	// If the module file exists in workspace, it's own code
	for (const possiblePath of possiblePaths) {
		try {
			if (fs.existsSync(possiblePath)) {
				return true;
			}
		} catch (error) {
			// File doesn't exist or can't be accessed
			continue;
		}
	}

	// If module name matches the workspace folder name, it's likely own code
	const workspaceName = path.basename(workspacePath);
	if (baseModule === workspaceName || baseModule === workspaceName.replace(/-/g, '_')) {
		return true;
	}

	// Check if module is listed in setup.py, pyproject.toml, or __init__.py in workspace root
	// This would indicate it's part of the project
	try {
		const setupPyPath = path.join(workspacePath, 'setup.py');
		const pyprojectPath = path.join(workspacePath, 'pyproject.toml');

		if (fs.existsSync(setupPyPath)) {
			const setupContent = fs.readFileSync(setupPyPath, 'utf8');
			if (setupContent.includes(`'${baseModule}'`) || setupContent.includes(`"${baseModule}"`)) {
				return true;
			}
		}

		if (fs.existsSync(pyprojectPath)) {
			const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf8');
			if (pyprojectContent.includes(`"${baseModule}"`) || pyprojectContent.includes(`'${baseModule}'`)) {
				return true;
			}
		}
	} catch (error) {
		// Ignore errors reading project files
	}

	// If we can't find it in the workspace, assume it's external
	return false;
}

export function deactivate() { }
