/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2023 by
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

import { injectable } from "inversify";
import { SModelRootImpl, SNodeImpl, SvgExporter } from "sprotty";
import { RequestAction } from "sprotty-protocol";
import { SvgAction } from "./actions";

@injectable()
export class CustomSvgExporter extends SvgExporter {
    /**
     * Generates an SVG and dispatches an SVGAction.
     * @param root The root of the model.
     * @param request The request action that triggered this method.
     */
    internalExport(root: SModelRootImpl, request?: RequestAction<SvgAction>): void {
        if (typeof document !== "undefined") {
            const div = document.getElementById(this.options.hiddenDiv);
            if (div !== null && div.firstElementChild && div.firstElementChild.tagName === "svg") {
                const svgElement = div.firstElementChild as SVGSVGElement;
                const svg = this.createSvg(svgElement, root);
                const width =
                    root.children.length > 1
                        ? Math.max((root.children[0] as SNodeImpl).bounds.width, (root.children[1] as SNodeImpl).bounds.width)
                        : (root.children[0] as SNodeImpl).bounds.width;
                this.actionDispatcher.dispatch(SvgAction.create(svg, width, request ? request.requestId : ""));
            }
        }
    }

    
    createSvg(svgElementOrig: SVGSVGElement, root: SModelRootImpl): string {
        const serializer = new XMLSerializer();
        const svgCopy = serializer.serializeToString(svgElementOrig);
        const iframe: HTMLIFrameElement = document.createElement('iframe');
        document.body.appendChild(iframe);
        if (!iframe.contentWindow)
            throw new Error('IFrame has no contentWindow');
        const docCopy = iframe.contentWindow.document;
        docCopy.open();
        docCopy.write(svgCopy);
        docCopy.close();
        const svgElementNew = docCopy.querySelector('svg')!;
        svgElementNew.removeAttribute('opacity');
        // inline-size copied from sprotty-hidden svg shrinks the svg so it is not visible.
        this.copyStyles(svgElementOrig, svgElementNew, ['width', 'height', 'opacity', 'inline-size']);
        svgElementNew.setAttribute('version', '1.1');
        const bounds = this.getBounds(root, docCopy);

        // adjust the viewBox and size of the SVG because the line width of objects are otherwise not considered and the exported SVG is cropped
        // the values are adjusted by 10px on each side to ensure that the entire diagram is visible in the exported SVG.
        svgElementNew.setAttribute('viewBox', `${bounds.x-10} ${bounds.y-10} ${bounds.width+20} ${bounds.height+20}`);
        svgElementNew.setAttribute('width', `${bounds.width+20}`);
        svgElementNew.setAttribute('height', `${bounds.height+20}`);

        this.postprocessors.forEach(postprocessor => {
            postprocessor.postUpdate(svgElementNew, undefined);
        });

        const svgCode = serializer.serializeToString(svgElementNew);
        document.body.removeChild(iframe);

        return svgCode;
    }
}
