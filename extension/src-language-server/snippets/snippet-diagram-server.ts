/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2024 by
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

import {
    Action,
    applyBounds,
    ComputedBoundsAction,
    DiagramServer,
    DiagramServices,
    JsonMap,
    RequestBoundsAction,
    RequestModelAction,
} from "sprotty-protocol";
import { Connection } from "vscode-languageserver";
import {
    AddSnippetAction,
    ExecuteSnippetAction,
    RequestWebviewSnippetsAction,
    SendDefaultSnippetsAction,
    SendWebviewSnippetsAction,
} from "./actions.js";
import { LanguageSnippet, SnippetGraphGenerator, WebviewSnippet } from "./snippet-model.js";

export abstract class SnippetDiagramServer extends DiagramServer {
    protected clientId: string;
    /** currently shown snippets */
    protected snippets: LanguageSnippet[] = [];
    /** default snippets that are added if no snippets are in the config file */
    protected defaultSnippets: LanguageSnippet[];
    /** options for the current source model */
    protected options: JsonMap | undefined;
    /** connection to the extension */
    protected connection: Connection | undefined;
    /** generator for snippet sgraphs */
    protected snippetGraphGenerator: SnippetGraphGenerator;

    constructor(
        dispatch: <A extends Action>(action: A) => Promise<void>,
        services: DiagramServices,
        clientId: string,
        snippets: LanguageSnippet[],
        options: JsonMap | undefined,
        connection: Connection | undefined
    ) {
        super(dispatch, services);
        this.clientId = clientId;
        this.options = options;
        this.connection = connection;
        this.defaultSnippets = snippets;
        this.snippetGraphGenerator = services.DiagramGenerator as SnippetGraphGenerator;
    }

    /**
     * Returns the snippets that should be send to the webview for rendering.
     */
    protected async getSnippetsForWebview(): Promise<WebviewSnippet[]> {
        const webviewSnippets: WebviewSnippet[] = [];
        for (const snippet of this.snippets) {
            // generate graph for snippet
            let graph = await this.snippetGraphGenerator.generateSnippetRoot(snippet);
            if (graph) {
                // compute bounds for snippet graph
                const request = RequestBoundsAction.create(graph);
                const response = await this.request<ComputedBoundsAction>(request);
                applyBounds(graph, response);
                // layout snippet graph
                const newRoot = await this.layoutEngine?.layout(graph);
                if (newRoot) {
                    graph = newRoot;
                }
                // create webview snippet
                const webviewSnippet = {
                    graph: graph,
                    id: snippet.id,
                };
                webviewSnippets.push(webviewSnippet);
            } else {
                console.log("For snippet " + snippet.id + " no graph could be generated.");
            }
        }
        return webviewSnippets;
    }

    protected handleAction(action: Action): Promise<void> {
        switch (action.kind) {
            case ExecuteSnippetAction.KIND:
                return this.handleExecuteSnippet(action as ExecuteSnippetAction);
            case AddSnippetAction.KIND:
                return this.handleAddSnippet(action as AddSnippetAction);
            case SendDefaultSnippetsAction.KIND:
                return this.handleSendSnippets(action as SendDefaultSnippetsAction);
        }
        return super.handleAction(action);
    }

    /**
     * Creates a snippet based on {@code action} and adds it to the snippet list & config.
     * @param action Action containing the text to create a snippet.
     * @returns
     */
    protected async handleAddSnippet(action: AddSnippetAction): Promise<void> {
        const snippet = this.createSnippetFromString(action.text);
        if (await this.parseable(snippet)) {
            await this.snippetGraphGenerator.deleteDanglingEdges(snippet);
            this.addSnippets([snippet]);
            this.connection?.sendNotification("config/add", [snippet.baseCode]);
        } else {
            this.connection?.sendNotification("snippets/creationFailed");
        }
        return Promise.resolve();
    }

    /**
     * Determines if a snippet is parseable i.e. an AST can be created.
     * @param snippet The snippet to check.
     * @returns whether the snippet is parseable.
     */
    protected async parseable(snippet: LanguageSnippet): Promise<boolean> {
        const graph = await this.snippetGraphGenerator.generateSnippetRoot(snippet);
        return graph ? true : false;
    }

    /**
     * Creates snippets based on the texts in {@code action} and updates the webview.
     * @param action Action containing the snippets texts.
     * @returns
     */
    protected handleSendSnippets(action: SendDefaultSnippetsAction): Promise<void> {
        // if no snippets are in the config file, add the default ones
        if (action.snippets.length === 0) {
            this.snippets = this.defaultSnippets;
            this.connection?.sendNotification(
                "config/add",
                this.defaultSnippets.map(snippet => snippet.insertText)
            );
        } else {
            this.snippets = action.snippets.map(snippet => this.createSnippetFromString(snippet));
        }
        this.update();
        return Promise.resolve();
    }

    /**
     * Creates snippets based on the given {@code text}.
     * @param text The text to create the snippets from.
     * @returns a snippet created from the text.
     */
    protected abstract createSnippetFromString(text: string): LanguageSnippet;

    /**
     * Adds the given snippets to the snippet list and updates the webview.
     * @param snippets The snippets to add.
     */
    addSnippets(snippets: LanguageSnippet[]): void {
        this.snippets.push(...snippets);
        this.update();
    }

    /**
     * Updates the webview with the current snippets.
     */
    async update(): Promise<void> {
        const snippets = await this.getSnippetsForWebview();
        // send the avaiable snippets to the client to get them rendered
        const response = await this.request<SendWebviewSnippetsAction>({
            kind: RequestWebviewSnippetsAction.KIND,
            snippets: snippets,
            clientId: this.clientId,
        } as RequestWebviewSnippetsAction);
        // send graph svgs to extension
        this.connection?.sendNotification("snippets/add", { snippets: response.snippets });
    }

    /**
     * Adds the text of the snippet in {@code action} to the editor.
     * @param action
     */
    protected async handleExecuteSnippet(action: ExecuteSnippetAction): Promise<void> {
        // uri of the file in which the snippet should be inserted
        const uri = this.options?.sourceUri;
        const snippet = this.snippets.find(snippet => snippet.id === action.id);
        if (snippet) {
            // determine position where to add
            const pos = snippet.getPosition(uri as string);
            // add the text of the snippet to the editor
            this.connection?.sendNotification("editor/add", { uri: uri, text: snippet.insertText, position: pos });
        } else {
            console.error("There is no Diagram Snippet with id " + action.id);
        }
    }

    protected async handleRequestModel(action: RequestModelAction): Promise<void> {
        // options must be updated since the request could be for another source model
        this.options = action.options;
        super.handleRequestModel(action);
    }
}
