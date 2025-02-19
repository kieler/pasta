/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2024 by
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
    AstNode,
    AstUtils,
    LangiumDocument
} from "langium";
import {
    DefaultFoldingRangeProvider,
    FoldingRangeAcceptor,
} from "langium/lsp";
import {
    Model
} from "../../generated/ast.js";

export class STPAFoldingRangeProvider extends DefaultFoldingRangeProvider {

    // override method to also create a folding for each aspect
    protected collectFolding(document: LangiumDocument, acceptor: FoldingRangeAcceptor): void {
        const root = document.parseResult?.value;
        if (root) {
            if (this.shouldProcessContent(root)) {
                const treeIterator = AstUtils.streamAllContents(root).iterator();
                let result: IteratorResult<AstNode>;
                // save the type of the previous top-most node
                let previousType = "";
                // save the start line of the first component of an aspect to determine the start of the last aspect
                let startLine = 0;
                // save the end line of the last node to possibly determine the end of the last aspect
                let lastNodeEndLine: number = -1;
                do {
                    result = treeIterator.next();
                    if (!result.done) {
                        const node = result.value;
                        // add folding for each aspect
                        // only consider top-most nodes to determine when the aspect of current node changes
                        const isTopNode = node.$container?.$type === Model;
                        if (isTopNode && previousType !== node.$type) {
                            // if the type of the current top-most node is different from the previous top-most node, add folding for the previous aspect
                            const endLine = lastNodeEndLine ?? -1;
                            const range = { startLine: startLine, endLine: endLine };
                            acceptor(range);
                            // update the start line for the new aspect
                            const nodeStartLine = node.$cstNode?.range.start.line;
                            startLine = nodeStartLine ? nodeStartLine - 1 : -1;
                        }

                        if (this.shouldProcess(node)) {
                            this.collectObjectFolding(document, node, acceptor);
                        }
                        if (!this.shouldProcessContent(node)) {
                            treeIterator.prune();
                        }
                        // update the previous type and the end line of the last node
                        if (isTopNode) {
                            previousType = node.$type;
                        }
                        lastNodeEndLine = node.$cstNode?.range.end.line ?? -1;
                    }
                } while (!result.done);
                // add folding for last aspect
                const endLine = lastNodeEndLine ?? -1;
                const range = { startLine: startLine, endLine: endLine };
                acceptor(range);
            }

            this.collectCommentFolding(document, root, acceptor);
        }
    }
}
