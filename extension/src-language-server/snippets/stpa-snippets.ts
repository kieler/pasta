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

import { LangiumDocument, LangiumDocuments } from "langium";
import { LangiumServices } from "langium/lsp";
import { Position } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { Model } from '../generated/ast.js';
import * as defaultSnippets from "./default-stpa-snippets.json";
import { LanguageSnippet } from "./snippet-model.js";

/**
 * Class that handles snippets for the STPA diagram.
 */
export class StpaDiagramSnippets {
    protected readonly langiumDocuments: LangiumDocuments;
    /** Counts how much custom snippets exist */
    protected customSnippetsNumber: number = 0;
    /** The currently existing snippets */
    protected snippets: LanguageSnippet[];

    constructor(services: LangiumServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.snippets = this.generateDefaultSnippets();
    }

    /**
     * Creates the default snippets.
     * @returns a list with the default snippets.
     */
    protected generateDefaultSnippets(): LanguageSnippet[] {
        const list: LanguageSnippet[] = [];
        defaultSnippets.default.snippets.forEach((snippet: { name: string; code: string }) => {
            list.push(new CustomCSSnippet(this.langiumDocuments, snippet.code, snippet.name));
        });
        return list;
    }

    /**
     * Creates a snippet for the given {@code text}.
     * @param text The text that should be inserted when clicking on the snippet.
     * @returns a snippet for the given {@code text}.
     */
    createSnippet(text: string): LanguageSnippet {
        // TODO: currently only control structure
        this.customSnippetsNumber++;
        return new CustomCSSnippet(this.langiumDocuments, text, "CS" + this.customSnippetsNumber);
    }

    /**
     * Get the snippets that are available.
     * @returns all available snippets.
     */
    getSnippets(): LanguageSnippet[] {
        return this.snippets;
    }
}

/**
 * Calculates the actual text of snippets for the control structure and their position in the document.
 * @param document The document in which the snippet should be inserted.
 * @param snippet The snippet that should be inserted.
 * @returns the position where the snippet should be added to the {@code document}.
 */
function getPositionForCSSnippet(langDoc: LangiumDocument, snippet: LanguageSnippet): Position {
    const document = langDoc.textDocument;
    const docText = document.getText();
    // determine range of already existing definition of control structure
    // TODO: only working for STPA not FTA
    const model = (langDoc.parseResult.value as Model);
    const csStartIndex = model.controlStructure?.$cstNode?.offset ?? -1;
    const startIndex = csStartIndex !== -1 ? csStartIndex : 0;
    const csEnd = model.controlStructure?.$cstNode?.range.end;
    const endIndex = csEnd ? document.offsetAt(csEnd) : docText.length - 1;
    if (csStartIndex === -1) {
        return document.positionAt(endIndex);
    } else {
        // delete the control structure keyword
        snippet.insertText = snippet.insertText.substring(18, snippet.insertText.length);
        // check whether a graph ID already exist
        const csText = docText.substring(startIndex, endIndex + 1);
        const graphIndex = csText.indexOf("{");
        if (graphIndex === -1) {
            return document.positionAt(endIndex);
        } else {
            // delete the graph ID
            snippet.insertText = snippet.insertText.substring(
                snippet.insertText.indexOf("{") + 1,
                snippet.insertText.lastIndexOf("}")
            );
            const bracketIndex = csText.lastIndexOf("}");
            return document.positionAt(csStartIndex + bracketIndex);
        }
    }
}

/**
 * Adds {@code id} to the control structure node names in {@code text} to avoid name clashes.
 * @param text The control structure text.
 * @param document The document in which the text should be inserted.
 * @returns The modified text.
 */
function addNodeIDs(text: string, document: TextDocument): string {
    // collect the node names in the given text
    const words = getWords(text);
    const names: string[] = [];
    if (words) {
        for (let i = 3; i < words.length; i++) {
            if (words[i] === "{" && !isKeyWord(words[i - 1])) {
                names.push(words[i - 1]);
            }
        }
    }

    const docText = document.getText();
    // adjust the node names to be unique
    names.forEach(name => {
        // collect existing IDs starting with the node name
        const existingIDsRegex = new RegExp(`${name}_[0-9]*`, "g");
        // set is needed to avoid duplicates in the existing IDs
        const existingIDs = new Set(docText.match(existingIDsRegex));
        // replace the node name with the adjusted name,
        // which consists of the name, "_", and a number depending on the number of already existing IDs
        const nameRegex = new RegExp(name, "g");
        text = text.replace(nameRegex, `${name}_${existingIDs?.size ?? 0}`);
    });

    return text;
}

/**
 * Checks whether the given {@code text} is a keyword.
 * @param text The text to check.
 * @returns whether the given {@code text} is a keyword.
 */
function isKeyWord(text: string): boolean {
    return (
        text === "hierarchyLevel" ||
        text === "label" ||
        text === "processModel" ||
        text === "controlActions" ||
        text === "feedback"
    );
}

/**
 * Collects the words of the given {@code text}.
 * @param text The text to collect the words from.
 * @returns the words of the given {@code text}.
 */
function getWords(text: string): string[] {
    const regex = /[\{\}a-zA-Z0-9_]*/g;
    const splits = text.match(regex);
    // in "splits "{" and "}" are not separated from the other words if no whitespace is used before them
    // so this need to be split again
    const words = splits
        ?.map(s => s.split(/([\{\}])/g))
        .flat()
        .filter(child => child !== "");
    return words ?? [];
}

/**
 * Snippet language definition for STPA.
 */
export class STPALanguageSnippet implements LanguageSnippet {
    /** The text that should be inserted when clicking on the snippet. Contains unique names. */
    insertText: string;
    documents: LangiumDocuments;
    /** The id of the snippet */
    id: string;
    /** The base code of the snippet. Always starts with the header of the corresponding aspect. */
    baseCode: string;

    constructor(documents: LangiumDocuments, code: string, id: string) {
        this.documents = documents;
        this.id = id;
        this.insertText = code.trim();
        this.baseCode = code.trim();
    }

    getPosition(uri: string): Position {
        const document = this.documents.getDocument(URI.parse(uri));
        if (document) {
            this.insertText = addNodeIDs(this.baseCode, document.textDocument);
            return getPositionForCSSnippet(document, this);
        }
        return { line: 0, character: 0 };
    }
}

/**
 * Custom stpa snippet for the control structure.
 */
export class CustomCSSnippet extends STPALanguageSnippet {
    constructor(documents: LangiumDocuments, code: string, id: string) {
        super(documents, code, id);
        this.checkCaption();
    }

    /**
     * Check whether the control structure caption and graph name exist. If not, add them to the baseCode.
     */
    protected checkCaption(): void {
        const words = getWords(this.baseCode);
        // check whether the caption and graph name exist, add them if not
        if (words && words.length >= 1 && words[0] !== "ControlStructure") {
            if (words.length >= 3 && (isKeyWord(words[2]) || words[2] === "}")) {
                this.baseCode = "ControlStructure\r\nCS {\r\n" + this.baseCode + "\r\n}";
            } else {
                this.baseCode = "ControlStructure\r\n" + this.baseCode;
            }
        }
    }
}
