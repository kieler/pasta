/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2023 by
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

import * as path from "path";
import { ActionMessage } from "sprotty-protocol";
import { createFileUri, registerDefaultCommands } from "sprotty-vscode";
import { acceptMessageType, LspSprottyEditorProvider, LspSprottyViewProvider } from "sprotty-vscode/lib/lsp";
import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import { Messenger } from "vscode-messenger";
import { ResetRenderOptionsAction, UpdateDiagramAction } from "./actions";
import { command } from "./constants";
import { DiagramSnippetWebview } from "./diagram-snippets-webview";
import { StpaLspVscodeExtension } from "./language-extension";
import { createSTPAResultMarkdownFile } from "./report/md-export";
import { StpaResult } from "./report/utils";
import { createSBMs } from "./sbm/sbm-generation";
import { LTLFormula } from "./sbm/utils";
import { StorageService } from "./storage-service";
import { createFile, createOutputChannel, setStorageOption } from "./utils";

let languageClient: LanguageClient;

/* The names of the groups for the storage options. */
export const validationGroupName = "validation";
export const idGenGroupName = "IDGeneration";

/* The contexts for the validation checks. */
const validationContexts = [
    "checkResponsibilitiesForConstraints",
    "checkConstraintsForUCAs",
    "checkScenariosForUCAs",
    "checkSafetyRequirementsForUCAs",
    "checkMissingFeedback",
];

/* The contexts for the ID generation. */
const idGenContexts = ["generateIDs"];

/* The command prefixes for toggling and contexts for the different storage groups. */
const contextsAndPrefixForGroups: Map<string, {commandPrefix: string, contexts: string[]}> = new Map([
    [validationGroupName, {commandPrefix: ".stpa.checks", contexts: validationContexts}],
    [idGenGroupName, {commandPrefix: ".stpa", contexts: idGenContexts}],
]);

/**
 * All file endings of the languages that are supported by pasta.
 * The file ending should also be the language id, since it is also used to
 * register document selectors in the language client.
 */
const supportedFileEndings = ["stpa", "fta"];

export function activate(context: vscode.ExtensionContext): void {
    vscode.window.showInformationMessage("Activating STPA extension");

    const diagramMode = process.env.DIAGRAM_MODE || "panel";
    if (!["panel", "editor", "view"].includes(diagramMode)) {
        throw new Error("The environment variable 'DIAGRAM_MODE' must be set to 'panel', 'editor' or 'view'.");
    }

    languageClient = createLanguageClient(context);

    // maybe needed in next sprotty update
    // const extensionPath = context.extensionUri.fsPath;
    // const localResourceRoots = [createFileUri(extensionPath, 'pack', 'src-webview')];
    // const createWebviewHtml = (identifier: SprottyDiagramIdentifier, container: WebviewContainer): string => doCreateWebviewHtml(identifier, container, {
    //     scriptUri: createFileUri(extensionPath, 'pack', 'src-webview', 'main.js'),
    //     cssUri: createFileUri(extensionPath, 'pack', 'src-webview', 'main.css')
    // });
    // const configureEndpoint = (endpoint: WebviewEndpoint): void => {
    //     addWorkspaceEditActionHandler(endpoint as LspWebviewEndpoint);
    //     addLspLabelEditActionHandler(endpoint as LspWebviewEndpoint);
    // };


    // Create context key of supported languages
    vscode.commands.executeCommand("setContext", "pasta.languages", supportedFileEndings);

    const storage = new StorageService(context.workspaceState);

    if (diagramMode === "panel") {
        // Set up webview panel manager for freestyle webviews
        const webviewPanelManager = new StpaLspVscodeExtension(
            {
                extensionUri: context.extensionUri,
                languageClient,
                supportedFileExtensions: [".stpa", ".fta"],
                // localResourceRoots,
                // createWebviewHtml,
                // configureEndpoint,
                singleton: true,
                messenger: new Messenger({ ignoreHiddenViews: false }),
            },
            "pasta",
            storage
        );
        registerDefaultCommands(webviewPanelManager, context, { extensionPrefix: "pasta" });

        registerTextEditorSync(webviewPanelManager, context);
        registerSTPACommands(webviewPanelManager, context, storage, { extensionPrefix: "pasta" });
        registerFTACommands(webviewPanelManager, context, { extensionPrefix: "pasta" });
        registerDiagramSnippetWebview(webviewPanelManager, context);
        registerPastaCommands(webviewPanelManager, context, { extensionPrefix: "pasta" });
    }

    if (diagramMode === "editor") {
        // Set up webview editor associated with file type
        const webviewEditorProvider = new LspSprottyEditorProvider({
            extensionUri: context.extensionUri,
            viewType: "stpa",
            languageClient,
            supportedFileExtensions: [".stpa"],
        });
        context.subscriptions.push(
            vscode.window.registerCustomEditorProvider("stpa", webviewEditorProvider, {
                webviewOptions: { retainContextWhenHidden: true },
            })
        );
        registerDefaultCommands(webviewEditorProvider, context, { extensionPrefix: "stpa" });
    }

    if (diagramMode === "view") {
        // Set up webview view shown in the side panel
        const webviewViewProvider = new LspSprottyViewProvider({
            extensionUri: context.extensionUri,
            viewType: "stpa",
            languageClient,
            supportedFileExtensions: [".stpa"],
            openActiveEditor: true,
            messenger: new Messenger({ ignoreHiddenViews: false }),
        });

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider("stpa", webviewViewProvider, {
                webviewOptions: { retainContextWhenHidden: true },
            })
        );
        registerDefaultCommands(webviewViewProvider, context, { extensionPrefix: "stpa" });
    }
}

export async function deactivate(): Promise<void> {
    if (languageClient) {
        await languageClient.stop();
    }
}

/**
 * Register all commands that are specific to PASTA.
 * @param manager The manager that handles the webview panels.
 * @param context The context of the extension.
 * @param options The options for the commands.
 */
function registerPastaCommands(
    manager: StpaLspVscodeExtension,
    context: vscode.ExtensionContext,
    options: { extensionPrefix: string }
): void {
    // Command for the user to remove all data stored by this extension. Allows
    // the user to reset changed synthesis options etc.
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + ".data.clear", async () => {
            StorageService.clearAll(context.workspaceState);
            // reset validation checks and synthesis options
            await languageClient.sendRequest("config/reset", {});
            resetContextForStorageOptions();
            // reset render options
            manager.endpoints.forEach(endpoint => {
                endpoint.sendAction(ResetRenderOptionsAction.create());
            });
            updateViews(manager, vscode.window.activeTextEditor?.document);
            vscode.window.showInformationMessage("Stored data has been deleted.");
        })
    );
}

/**
 * Reset the contexts for storage options to the default values.
 */
function resetContextForStorageOptions(): void {
    // set contexts for PASTA options depending on saved valued in storage
    vscode.commands.executeCommand("setContext", "pasta.checkResponsibilitiesForConstraints", true);
    vscode.commands.executeCommand("setContext", "pasta.checkConstraintsForUCAs", true);
    vscode.commands.executeCommand("setContext", "pasta.checkScenariosForUCAs", true);
    vscode.commands.executeCommand("setContext", "pasta.checkSafetyRequirementsForUCAs", true);
    vscode.commands.executeCommand("setContext", "pasta.checkMissingFeedback", true);
    vscode.commands.executeCommand("setContext", "pasta.generateIDs", true);
}

/**
 * Register all commands that are specific to STPA.
 * @param manager The manager that handles the webview panels.
 * @param context The context of the extension.
 * @param storage The storage service for the extension.
 * @param options The options for the commands.
 */
function registerSTPACommands(
    manager: StpaLspVscodeExtension,
    context: vscode.ExtensionContext,
    storage: StorageService,
    options: { extensionPrefix: string }
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            options.extensionPrefix + ".contextTable.open",
            async (...commandArgs: any[]) => {
                manager.createContextTable(context);
                await manager.contextTable.ready();
                const uri = (commandArgs[0] as vscode.Uri).toString();
                languageClient.sendNotification("contextTable/getData", uri);
            }
        )
    );

    setContextsBasedOnStorage(storage);
    registerCommandsForStorageUpdate(manager, context, storage, options);

    // needed to not activate ID generation on undo/redo
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + ".IDs.undo", async () => {
            manager.ignoreNextTextChange = true;
            vscode.commands.executeCommand("undo");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + ".IDs.redo", async () => {
            manager.ignoreNextTextChange = true;
            vscode.commands.executeCommand("redo");
        })
    );

    // command for creating a pdf
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + ".stpa.md.creation", async (uri: vscode.Uri) => {
            const data: StpaResult = await languageClient.sendRequest("result/getData", uri.toString());
            await createSTPAResultMarkdownFile(data, manager);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + ".stpa.SBM.generation", async (uri: vscode.Uri) => {
            await manager.lsReady;
            const formulas: Record<string, LTLFormula[]> = await languageClient.sendRequest(
                "verification/generateLTL",
                uri.path
            );
            // controlAction names are just the action without the controller as prefix
            // generate a safe behavioral model
            const controlActions: Record<string, string[]> = await languageClient.sendRequest(
                "verification/getControlActions",
                uri.path
            );
            createSBMs(controlActions, formulas);
        })
    );

    // command for creating fault trees
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + ".stpa.ft.generation", async (uri: vscode.Uri) => {
            await manager.lsReady;
            const texts: string[] = await languageClient.sendRequest("generate/faultTrees", uri.toString());
            const baseUri = uri.toString().substring(0, uri.toString().lastIndexOf("/"));
            const fileName = uri.toString().substring(uri.toString().lastIndexOf("/"), uri.toString().lastIndexOf("."));
            texts.forEach((text, index) => createFile(`${baseUri}/generatedFTA${fileName}-fta${index}.fta`, text));
        })
    );

    // register commands that other extensions can use
    context.subscriptions.push(
        vscode.commands.registerCommand(command.getLTLFormula, async (uri: string) => {
            // generate and send back the LTLs based on the STPA UCAs
            await manager.lsReady;
            const formulas: Record<string, LTLFormula[]> = await languageClient.sendRequest(
                "verification/generateLTL",
                uri
            );
            return formulas;
        })
    );
}

/**
 * Register the commands for setting and unsetting the contexts for the storage options.
 * The command name must end with ".set" or ".unset" respectively and the name (camel-cased) of the context that should be set or unset.
 * For the prefix of the command see {@code contextsAndPrefixForGroups}.
 * The context name has to be the same as the key in the storage.
 * @param manager The manager that handles the webview panels.
 * @param context The context of the extension.
 * @param storage The storage service for the extension.
 * @param options The options for the commands.
 */
function registerCommandsForStorageUpdate(
    manager: StpaLspVscodeExtension,
    context: vscode.ExtensionContext,
    storage: StorageService,
    options: { extensionPrefix: string }
): void {
    for (const groupName of contextsAndPrefixForGroups.keys()) {
        const prefix = contextsAndPrefixForGroups.get(groupName)?.commandPrefix;
        for (const contextOfGroup of contextsAndPrefixForGroups.get(groupName)?.contexts ?? []) {
            context.subscriptions.push(
                vscode.commands.registerCommand(
                    options.extensionPrefix +
                        prefix + ".set" +
                        contextOfGroup.charAt(0).toUpperCase() +
                        contextOfGroup.slice(1),
                    async () => {
                        vscode.commands.executeCommand("setContext", "pasta." + contextOfGroup, true);
                        setStorageOption(groupName, contextOfGroup, true, storage, languageClient, manager);
                    }
                )
            );
            context.subscriptions.push(
                vscode.commands.registerCommand(
                    options.extensionPrefix +
                        prefix + ".unset" +
                        contextOfGroup.charAt(0).toUpperCase() +
                        contextOfGroup.slice(1),
                    async () => {
                        vscode.commands.executeCommand("setContext", "pasta." + contextOfGroup, false);
                        setStorageOption(groupName, contextOfGroup, false, storage, languageClient, manager);
                    }
                )
            );
        }
    }
}

/**
 * Sets the context based on the storage for the custom contexts of PASTA.
 * The context name has to be the same as the key in the storage.
 * @param storage The storage service for the extension.
 */
function setContextsBasedOnStorage(storage: StorageService): void {
    for (const groupName of contextsAndPrefixForGroups.keys()) {
        const group = storage.getItem(groupName);
        for (const contextOfGroup of contextsAndPrefixForGroups.get(groupName)?.contexts ?? []) {
            vscode.commands.executeCommand(
                "setContext",
                "pasta." + contextOfGroup,
                group && group[contextOfGroup] !== undefined ? group[contextOfGroup] : true
            );
        }
    }
}

/**
 * Register all commands that are specific to FTA.
 * @param manager The manager that handles the webview panels.
 * @param context The context of the extension.
 * @param options The options for the commands.
 */
function registerFTACommands(
    manager: StpaLspVscodeExtension,
    context: vscode.ExtensionContext,
    options: { extensionPrefix: string }
): void {
    // commands for computing and displaying the (minimal) cut sets of the fault tree.
    context.subscriptions.push(
        vscode.commands.registerCommand(
            options.extensionPrefix + ".fta.cutSets",
            async (uri: vscode.Uri, startId?: string) => {
                const cutSets: string[] = await languageClient.sendRequest("cutSets/generate", {
                    uri: uri.path,
                    startId,
                });
                await manager.openDiagram(uri, { preserveFocus: true });
                handleCutSets(cutSets, false);
            }
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            options.extensionPrefix + ".fta.minimalCutSets",
            async (uri: vscode.Uri, startId?: string) => {
                const minimalCutSets: string[] = await languageClient.sendRequest("cutSets/generateMinimal", {
                    uri: uri.path,
                    startId,
                });
                await manager.openDiagram(uri, { preserveFocus: true });
                handleCutSets(minimalCutSets, true);
            }
        )
    );
}

/**
 * Handles the result of the cut set analysis.
 * @param cutSets The cut sets that should be handled.
 * @param minimal Determines whether the cut sets are minimal or not.
 */
function handleCutSets(cutSets: string[], minimal?: boolean): void {
    // print cut sets to output channel
    createOutputChannel(cutSets, "FTA Cut Sets", minimal);
}

function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join("pack",  "src-language-server", "main.cjs"));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = {
        execArgv: [
            "--nolazy",
            `--inspect${process.env.DEBUG_BREAK ? "-brk" : ""}=${process.env.DEBUG_SOCKET || "6009"}`,
        ],
    };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*.{stpa,fta}");
    context.subscriptions.push(fileSystemWatcher);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: supportedFileEndings.map(ending => ({
            scheme: "file",
            language: ending,
        })),
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher,
        },
    };

    // Create the language client and start the client.
    const languageClient = new LanguageClient("stpa", "stpa", serverOptions, clientOptions);

    // Start the client. This will also launch the server
    languageClient.start();
    return languageClient;
}

function registerTextEditorSync(manager: StpaLspVscodeExtension, context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async changeEvent => {
            const svgGeneration = changeEvent.contentChanges[0]?.text.startsWith(
                '<svg xmlns="http://www.w3.org/2000/svg"'
            );
            // if the change event is triggered by the generation of an SVG, do not update the views
            const fileTypeIsSupportedLanguage = changeEvent.document.uri.toString().endsWith(".stpa") || changeEvent.document.uri.toString().endsWith(".fta");
            if (fileTypeIsSupportedLanguage && !svgGeneration) {
                const document = changeEvent.document;
                updateViews(manager, document);
            }
        }),
        vscode.workspace.onDidOpenTextDocument(async document => {
            manager.openDiagram(document.uri, { preserveFocus: true });
        })
    );
}

async function updateViews(manager: StpaLspVscodeExtension, document?: vscode.TextDocument): Promise<void> {
    if (document) {
        // reset cut sets
        await languageClient.sendRequest("cutSets/reset");
        // save the current cursor position
        const currentCursorPosition = vscode.window.activeTextEditor?.selection.active;
        if (currentCursorPosition) {
            await languageClient.sendNotification("editor/change", document.offsetAt(currentCursorPosition));
        }

        // update diagram without reseting viewport
        if (manager.clientId) {
            const message: ActionMessage = {
                clientId: manager.clientId!,
                action: {
                    kind: UpdateDiagramAction.KIND,
                    options: {
                        sourceUri: document.uri.toString(),
                    }
                } as UpdateDiagramAction,
            };
            languageClient.sendNotification(acceptMessageType, message);
        }

        // update the context table
        if (manager.contextTable) {
            if (document.uri.toString().endsWith(".stpa")) {
                languageClient.sendNotification("contextTable/getData", document.uri.toString());
            }
        }
    }
}

/**
 * Registers the webview for the diagram snippets.
 * @param manager The manager that handles the webview panels.
 * @param context The context of the extension.
 */
function registerDiagramSnippetWebview(manager: StpaLspVscodeExtension, context: vscode.ExtensionContext): void {
    // create a webview view provider for the snippets
    const provider: vscode.WebviewViewProvider = {
        resolveWebviewView: function (
            webviewView: vscode.WebviewView,
            _context: vscode.WebviewViewResolveContext<unknown>,
            _token: vscode.CancellationToken
        ): void | Thenable<void> {
            const snippetWebview = new DiagramSnippetWebview(
                "snippets",
                manager,
                createFileUri(manager.options.extensionUri.fsPath, 'pack', 'src-diagram-snippets', 'main.js'),
                createFileUri(manager.options.extensionUri.fsPath, 'pack', 'src-diagram-snippets', 'main.css')
            );
            snippetWebview.webview = webviewView.webview;
            snippetWebview.webview.options = {
                enableScripts: true,
            };
            const title = snippetWebview.createTitle();
            webviewView.title = title;
            snippetWebview.initializeWebview(webviewView.webview, title);
            snippetWebview.connect();
            // send snippets got from the language server to the webview
            languageClient.onNotification("snippets/add", (msg: any) => snippetWebview.sendToWebview(msg));
        },
    };
    // register the webview view provider
    vscode.window.registerWebviewViewProvider("stpa-snippets", provider);
    // register the command to add snippets
    context.subscriptions.push(
        vscode.commands.registerCommand("pasta" + ".stpa.snippets.add", async (...commandArgs: any) => {
            const uri = commandArgs[0] as vscode.Uri;
            manager.addSnippet(uri);
        })
    );
}
