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

import { inject, injectable } from "inversify";
import { VNode } from "snabbdom";
import { IVNodePostprocessor, SModelElementImpl, SModelRootImpl, TYPES } from "sprotty";
import { Action } from "sprotty-protocol";
import { RequestSvgAction } from "./actions";
import { CustomSvgExporter } from "./exporter";

/** Replaces the default SvgPostprocessor to use the custom svg exporter. */
@injectable()
export class SvgPostprocessor implements IVNodePostprocessor {

    root: SModelRootImpl;

    @inject(TYPES.SvgExporter) protected svgExporter: CustomSvgExporter;

    decorate(vnode: VNode, element: SModelElementImpl): VNode {
        if (element instanceof SModelRootImpl) { this.root = element; }
        return vnode;
    }

    postUpdate(cause?: Action): void {
        // triggers an internal export
        if (this.root && cause !== undefined && cause.kind === RequestSvgAction.KIND) {
            this.svgExporter.internalExport(this.root, cause as RequestSvgAction);
        }
    }
}