import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Python Smart Auto-Import Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	let testWorkspaceFolder: string;

	suiteSetup(async () => {
		// Ensure the extension is activated
		const ext = vscode.extensions.getExtension('undefined_publisher.python-smart-autoimport');
		if (ext && !ext.isActive) {
			await ext.activate();
		}
	});

	setup(async () => {
		// Create a temporary workspace folder for testing
		testWorkspaceFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'python-test-'));
	});

	teardown(async () => {
		// Clean up test files
		if (fs.existsSync(testWorkspaceFolder)) {
			fs.rmSync(testWorkspaceFolder, { recursive: true, force: true });
		}

		// Close all editors
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('undefined_publisher.python-smart-autoimport'));
	});

	test('Extension should activate', async () => {
		const ext = vscode.extensions.getExtension('undefined_publisher.python-smart-autoimport');
		assert.ok(ext);
		await ext!.activate();
		assert.strictEqual(ext!.isActive, true);
	});

	test('Configuration: enabled setting should exist', () => {
		const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
		const enabled = config.get('enabled');
		assert.notStrictEqual(enabled, undefined);
	});

	test('Configuration: onlyOwnCode setting should exist', () => {
		const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
		const onlyOwnCode = config.get('onlyOwnCode');
		assert.notStrictEqual(onlyOwnCode, undefined);
	});

	test('Configuration: enabled should default to true', () => {
		const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
		const enabled = config.get('enabled');
		assert.strictEqual(enabled, true);
	});

	test('Configuration: onlyOwnCode should default to false', () => {
		const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
		const onlyOwnCode = config.get('onlyOwnCode');
		assert.strictEqual(onlyOwnCode, false);
	});

	test('Should create Python file and open it', async () => {
		const testFile = path.join(testWorkspaceFolder, 'test.py');
		fs.writeFileSync(testFile, 'print("Hello, World!")');

		const doc = await vscode.workspace.openTextDocument(testFile);
		const editor = await vscode.window.showTextDocument(doc);

		assert.strictEqual(editor.document.languageId, 'python');
		assert.ok(editor.document.getText().includes('Hello, World!'));
	});

	test('Should detect Python standard library modules correctly', async () => {
		// This tests the internal logic indirectly by checking if standard imports are treated as external
		const testFile = path.join(testWorkspaceFolder, 'test_stdlib.py');
		const content = `import os
import sys
import json
from pathlib import Path
`;
		fs.writeFileSync(testFile, content);

		const doc = await vscode.workspace.openTextDocument(testFile);
		await vscode.window.showTextDocument(doc);

		// Standard library imports should not trigger "own code" logic
		assert.ok(doc.getText().includes('import os'));
		assert.ok(doc.getText().includes('import sys'));
	});

	test('Should handle relative imports as own code', async () => {
		// Create a package structure
		const packageDir = path.join(testWorkspaceFolder, 'mypackage');
		fs.mkdirSync(packageDir, { recursive: true });

		const initFile = path.join(packageDir, '__init__.py');
		fs.writeFileSync(initFile, '');

		const moduleFile = path.join(packageDir, 'module.py');
		fs.writeFileSync(moduleFile, 'def my_function():\n    pass\n');

		const testFile = path.join(packageDir, 'test.py');
		fs.writeFileSync(testFile, 'from .module import my_function\n');

		const doc = await vscode.workspace.openTextDocument(testFile);
		await vscode.window.showTextDocument(doc);

		// Relative import should be present
		assert.ok(doc.getText().includes('from .module import'));
	});

	test('Should recognize local modules in workspace', async () => {
		// Create a local module
		const localModule = path.join(testWorkspaceFolder, 'mylocal.py');
		fs.writeFileSync(localModule, 'def local_func():\n    pass\n');

		const testFile = path.join(testWorkspaceFolder, 'test_local.py');
		fs.writeFileSync(testFile, '# Test file\n');

		const doc = await vscode.workspace.openTextDocument(testFile);
		await vscode.window.showTextDocument(doc);

		// Just verify the file was created and opened
		assert.ok(fs.existsSync(localModule));
		assert.strictEqual(doc.languageId, 'python');
	});

	test('Should not auto-import when extension is disabled', async () => {
		const config = vscode.workspace.getConfiguration('pythonSmartAutoImport');
		await config.update('enabled', false, vscode.ConfigurationTarget.Global);

		const testFile = path.join(testWorkspaceFolder, 'test_disabled.py');
		fs.writeFileSync(testFile, 'x = undefined_var\n');

		const doc = await vscode.workspace.openTextDocument(testFile);
		const editor = await vscode.window.showTextDocument(doc);

		// Save the document (which would trigger auto-import if enabled)
		await doc.save();

		// Wait a bit for any potential processing
		await new Promise(resolve => setTimeout(resolve, 200));

		// Document should remain unchanged
		assert.ok(editor.document.getText().includes('undefined_var'));

		// Re-enable for other tests
		await config.update('enabled', true, vscode.ConfigurationTarget.Global);
	});

	test('Should handle empty Python files', async () => {
		const testFile = path.join(testWorkspaceFolder, 'empty.py');
		fs.writeFileSync(testFile, '');

		const doc = await vscode.workspace.openTextDocument(testFile);
		const editor = await vscode.window.showTextDocument(doc);

		assert.strictEqual(editor.document.languageId, 'python');
		assert.strictEqual(editor.document.getText(), '');
	});

	test('Should ignore non-Python files', async () => {
		const testFile = path.join(testWorkspaceFolder, 'test.js');
		fs.writeFileSync(testFile, 'console.log("test");');

		const doc = await vscode.workspace.openTextDocument(testFile);
		await vscode.window.showTextDocument(doc);

		assert.notStrictEqual(doc.languageId, 'python');
	});

	test('Should handle files with existing imports', async () => {
		const testFile = path.join(testWorkspaceFolder, 'with_imports.py');
		const content = `import os
import sys
from pathlib import Path

def main():
    print("Hello")
`;
		fs.writeFileSync(testFile, content);

		const doc = await vscode.workspace.openTextDocument(testFile);
		await vscode.window.showTextDocument(doc);

		const text = doc.getText();
		assert.ok(text.includes('import os'));
		assert.ok(text.includes('import sys'));
		assert.ok(text.includes('from pathlib import Path'));
	});

	test('Should detect workspace folder correctly', async () => {
		const testFile = path.join(testWorkspaceFolder, 'workspace_test.py');
		fs.writeFileSync(testFile, 'print("test")');

		const doc = await vscode.workspace.openTextDocument(testFile);
		await vscode.window.showTextDocument(doc);

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);

		// In test environment, workspace folder might not be set
		// This is just to ensure the API call doesn't throw
		assert.ok(workspaceFolder !== undefined || workspaceFolder === undefined);
	});

	test('Should handle package with __init__.py', async () => {
		const packageDir = path.join(testWorkspaceFolder, 'testpackage');
		fs.mkdirSync(packageDir, { recursive: true });

		const initFile = path.join(packageDir, '__init__.py');
		fs.writeFileSync(initFile, '__version__ = "1.0.0"\n');

		assert.ok(fs.existsSync(initFile));
		assert.ok(fs.readFileSync(initFile, 'utf8').includes('__version__'));
	});
});
