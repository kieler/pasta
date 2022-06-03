/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022 by
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
import { html, IModelFactory, ModelRenderer, SGraph, SNode, TYPES } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Bounds } from 'sprotty-protocol'
import { WebviewTemplate } from "./template-models";


/** Renderer that is capable of rendering templates to jsx. */
@injectable()
export class TemplateRenderer {
    @inject(TYPES.IModelFactory) protected modelFactory: IModelFactory;
    protected renderer: ModelRenderer;
    protected bounds: Bounds;

    setRenderer(renderer: ModelRenderer) {
        this.renderer = renderer;
    }
    
    setBounds(bounds: Bounds) {
        this.bounds = bounds;
    }

    /**
     * Renders all templates provided by the server.
     */
    renderTemplates(templates: WebviewTemplate[]): (VNode | "")[] | "" {
        if (templates.length === 0) return "";

        // labels and edges are only visible if they are within the canvas bounds
        for (const temp of templates) {
            (temp.graph as SGraph).canvasBounds = {width: this.bounds.width + 20, height: this.bounds.height, x: this.bounds.x, y: this.bounds.y};
        }

        const res = templates.map(template => {
            const graph = this.renderer?.renderElement(this.modelFactory.createRoot(template.graph));
            // padding of sidebar content is 16px
            const width = ((template.graph as SGraph).children[0] as SNode).size.width + 30;
            const height = ((template.graph as SGraph).children[0] as SNode).size.height + 30;
            if (graph?.data?.attrs) {
                graph.data.attrs["width"] = width;
                graph.data.attrs["height"] = height;
            }
            const result: VNode = <div>{graph}</div>;
            /* if (result.data) {
                const blubb = (width/368.0 * 100) + "%"
                result.data.style = {width: blubb}
            } */
            return result
        });
        return res;
    }

}
