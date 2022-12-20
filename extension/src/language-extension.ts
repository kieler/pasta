/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021 by
 * + Kiel University
 *   + Department of Computer Science
 *     + Real-Time and Embedded Systems Group
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { LspLabelEditActionHandler, WorkspaceEditActionHandler, SprottyLspEditVscodeExtension } from "sprotty-vscode/lib/lsp/editing";
import { SprottyDiagramIdentifier } from 'sprotty-vscode/lib/lsp';
import { SprottyWebview } from 'sprotty-vscode/lib/sprotty-webview';
import { ActionMessage, JsonMap } from 'sprotty-protocol';
import { UpdateViewAction } from './actions';
import { ContextTablePanel } from './context-table-panel';
import { StpaFormattingEditProvider } from './stpa-formatter';
import { StpaLspWebview } from './wview';
import { SelectAction } from 'sprotty-protocol';

export class StpaLspVscodeExtension extends SprottyLspEditVscodeExtension {

    protected contextTable: ContextTablePanel;
    protected lastUri: string;
    /** Saves the last selected UCA in the context table. */
    protected lastSelectedUCA: string[];

    constructor(context: vscode.ExtensionContext) {
        super('stpa', context);
        // user changed configuration settings
        vscode.workspace.onDidChangeConfiguration(() => {
            this.updateViews(this.languageClient, this.lastUri);
            // sends configuration of stpa to the language server
            this.languageClient.sendNotification('configuration', this.collectOptions(vscode.workspace.getConfiguration('pasta')));
        });

        // add auto formatting provider
        let sel: vscode.DocumentSelector = { scheme: 'file', language: 'stpa' };
        vscode.languages.registerDocumentFormattingEditProvider(sel, new StpaFormattingEditProvider());

        // this.languageClient.onReady().then(() => {
        //     // sends configuration of stpa to the language server
        //     this.languageClient.sendNotification('configuration', this.collectOptions(vscode.workspace.getConfiguration('pasta')));
        //     // handling of notifications regarding the context table
        //     this.languageClient.onNotification('contextTable/data', data => this.contextTable.setData(data));
        //     this.languageClient.onNotification('editor/highlight', (msg: { startLine: number, startChar: number, endLine: number, endChar: number; uri: string}) => {
        //         // highlight and reveal the given range in the editor
        //         const editor = vscode.window.visibleTextEditors.find(visibleEditor => visibleEditor.document.uri.toString() === msg.uri);
        //         if (editor) {
        //             const startPosition = new vscode.Position(msg.startLine, msg.startChar);
        //             const endPosition = new vscode.Position(msg.endLine, msg.endChar);
        //             editor.selection = new vscode.Selection(startPosition, endPosition);
        //             editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
        //         }
        //     });
        // });
    }

    /**
     * Collects the STPA options of the configuration settings and returns them as a list of their ids and values.
     * @param configuration The workspace configuration options.
     * @returns A list of the workspace options, whereby a option is represented with an id and its value.
     */
    protected collectOptions(configuration: vscode.WorkspaceConfiguration): { id: string, value: any; }[] {
        const values: { id: string, value: any; }[] = [];
        values.push({ id: "checkResponsibilitiesForConstraints", value: configuration.get("checkResponsibilitiesForConstraints") });
        values.push({ id: "checkConstraintsForUCAs", value: configuration.get("checkConstraintsForUCAs") });
        values.push({ id: "checkScenariosForUCAs", value: configuration.get("checkScenariosForUCAs") });
        values.push({ id: "checkSafetyRequirementsForUCAs", value: configuration.get("checkSafetyRequirementsForUCAs") });
        return values;
    }

    protected registerCommands(): void {
        super.registerCommands();
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.contextTable.open', async (...commandArgs: any[]) => {
                this.createContextTable();
                await this.contextTable.ready();
                this.lastUri = (commandArgs[0] as vscode.Uri).toString();
                this.languageClient.sendNotification('contextTable/getData', this.lastUri);
            })
        );
        // commands for toggling the provided validation checks
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.checks.setCheckResponsibilitiesForConstraints', async (...commandArgs: any[]) => {
                this.createQuickPickForWorkspaceOptions("checkResponsibilitiesForConstraints")
            })
        );
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.checks.checkConstraintsForUCAs', async (...commandArgs: any[]) => {
                this.createQuickPickForWorkspaceOptions("checkConstraintsForUCAs")
            })
        );
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.checks.checkScenariosForUCAs', async (...commandArgs: any[]) => {
                this.createQuickPickForWorkspaceOptions("checkScenariosForUCAs")
            })
        );
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.checks.checkSafetyRequirementsForUCAs', async (...commandArgs: any[]) => {
                this.createQuickPickForWorkspaceOptions("checkSafetyRequirementsForUCAs")
            })
        );
    }

    /**
     * Creates a quickpick containing the values "true" and "false". The selected value is set for the 
     * configuration option determined by {@code id}.
     * @param id The id of the configuration option that should be set.
     */
    protected createQuickPickForWorkspaceOptions(id: string) {
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = [{ label: "true" }, { label: "false" }];
        quickPick.onDidChangeSelection((selection) => {
            if (selection[0]?.label === "true") {
                vscode.workspace.getConfiguration('pasta').update(id, true);
            } else {
                vscode.workspace.getConfiguration('pasta').update(id, false);
            }
            quickPick.hide();
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();

    }

    protected getDiagramType(commandArgs: any[]): string | undefined {
        if (commandArgs.length === 0
            || commandArgs[0] instanceof vscode.Uri && commandArgs[0].path.endsWith('.stpa')) {
            return 'stpa-diagram';
        }
        return undefined;
    }

    createContextTable(): void {
        const tablePanel = new ContextTablePanel(
            'Context-Table',
            [this.getExtensionFileUri('pack')],
            this.getExtensionFileUri('pack', 'context-table-panel.js')
        );
        this.contextTable = tablePanel;

        // adds listener for mouse click on a cell
        this.context.subscriptions.push(
            this.contextTable.cellClicked((cell: { rowId: string; columnId: string, text?: string; } | undefined) => {
                if (cell?.text === "No") {
                    // delete selection in the diagram
                    this.singleton?.dispatch(SelectAction.create({ deselectedElementsIDs: this.lastSelectedUCA }));
                    this.lastSelectedUCA = [];
                } else if (cell?.text) {
                    const texts = cell.text.split(",");
                    // language server must determine the range of the selected uca in the editor in order to highlight it
                    // when there are multiple UCAs in the cell only the first one is highlighted in the editor
                    this.languageClient.sendNotification('contextTable/selected', texts[0]);
                    // highlight corresponding node in the diagram and maybe deselect the last selected one
                    this.singleton?.dispatch(SelectAction.create({ selectedElementsIDs: texts, deselectedElementsIDs: this.lastSelectedUCA }));
                    this.lastSelectedUCA = texts;
                }
            })
        );
    }

    createWebView(identifier: SprottyDiagramIdentifier): SprottyWebview {
        const webview = new StpaLspWebview({
            extension: this,
            identifier,
            localResourceRoots: [
                this.getExtensionFileUri('pack')
            ],
            scriptUri: this.getExtensionFileUri('pack', 'webview.js'),
            singleton: true // Change this to `true` to enable a singleton view
        });
        webview.addActionHandler(WorkspaceEditActionHandler);
        webview.addActionHandler(LspLabelEditActionHandler);

        this.singleton = webview;
        return webview;
    }

    protected activateLanguageClient(context: vscode.ExtensionContext): LanguageClient {
        const serverModule = context.asAbsolutePath(path.join('pack', 'language-server'));
        // The debug options for the server
        // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
        // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
        const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
        };

        const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.stpa');
        context.subscriptions.push(fileSystemWatcher);

        // Options to control the language client
        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: 'file', language: 'stpa' }],
            synchronize: {
                // Notify the server about file changes to files contained in the workspace
                fileEvents: fileSystemWatcher
            }
        };

        // Create the language client and start the client.
        const languageClient = new LanguageClient(
            'stpa',
            'stpa',
            serverOptions,
            clientOptions
        );

        // Start the client. This will also launch the server
        languageClient.start();
        // diagram is updated when file changes
        fileSystemWatcher.onDidChange((uri) => this.updateViews(languageClient, uri.toString()));
        return languageClient;
    }

    protected updateViews(languageClient: LanguageClient, uri: string) {
        this.lastUri = uri;
        if (this.contextTable) {
            languageClient.sendNotification('contextTable/getData', uri);
        }
        if (this.singleton) {
            const mes: ActionMessage = {
                clientId: this.singleton?.diagramIdentifier.clientId,
                action: {
                    kind: UpdateViewAction.KIND,
                    options: {
                        diagramType: this.singleton.diagramIdentifier.diagramType,
                        needsClientLayout: true,
                        needsServerLayout: true,
                        sourceUri: this.singleton.diagramIdentifier.uri
                    } as JsonMap
                } as UpdateViewAction
            };
            languageClient.sendNotification('diagram/accept', mes);
        }
    }
}
