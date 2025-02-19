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

/** @jsx html */
import { inject, injectable } from "inversify";
import { VNode } from "snabbdom";
import { IModelFactory, ModelRenderer, SGraphImpl, SNodeImpl, TYPES, html } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Bounds } from 'sprotty-protocol';
import { WebviewSnippet } from "./snippet-models";


/** Renderer that is capable of rendering snippets to jsx. */
@injectable()
export class SnippetRenderer {
    @inject(TYPES.IModelFactory) protected modelFactory: IModelFactory;
    /** Needed to render the snippet graph. */
    protected modelRenderer: ModelRenderer;
    /** Needed to show labels and edges. */
    protected bounds: Bounds;
    /** Scale factor for the snippet graphs. */
    protected scale = 0.8;

    setModelRenderer(renderer: ModelRenderer): void {
        this.modelRenderer = renderer;
    }

    setBounds(bounds: Bounds): void {
        this.bounds = bounds;
    }

    /**
     * Renders all snippets provided by the server.
     */
    renderSnippets(snippets: WebviewSnippet[]): VNode[] {
        if (snippets.length === 0) {return <div></div>;}

        // labels and edges are only visible if they are within the canvas bounds
        for (const snippet of snippets) {
            (snippet.graph as SGraphImpl).canvasBounds = { width: this.bounds.width + 20, height: this.bounds.height, x: this.bounds.x, y: this.bounds.y };
        }

        const res = snippets.map(snippet => {
            // render the snippet graph
            const graph = this.modelRenderer?.renderElement(this.modelFactory.createRoot(snippet.graph));
            // padding of sidebar content is 16px
            const width = ((snippet.graph as SGraphImpl).children[0] as SNodeImpl).size.width + 30;
            const height = ((snippet.graph as SGraphImpl).children[0] as SNodeImpl).size.height + 30;
            if (graph?.data?.attrs) {
                graph.data.attrs["width"] = width * this.scale;
                graph.data.attrs["height"] = height * this.scale;
                graph.data.attrs["id"] = snippet.id;
            }
            // scale the graph to fit the sidebar better
            if (graph?.children && (graph.children[0] as VNode).data?.attrs) {
                (graph.children[0] as VNode).data!.attrs!["transform"] = `scale(${this.scale}) translate(0,0)`;
            }

            const result: VNode = <div>{graph}</div>;
            return result;
        });
        return res;
    }

}
