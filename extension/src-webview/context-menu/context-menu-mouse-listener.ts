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


import { ContextMenuMouseListener, SLabelImpl, SModelElementImpl } from "sprotty";

export class PastaContextMenuMouseListener extends ContextMenuMouseListener {

    protected async showContextMenu(target: SModelElementImpl, event: MouseEvent): Promise<void> {
        if (target instanceof SLabelImpl) {
            super.showContextMenu(target.parent, event);
        } else {
            super.showContextMenu(target, event);
        }
    }
}
