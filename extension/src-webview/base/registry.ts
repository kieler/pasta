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

import { injectable } from "inversify";
import { IActionHandler, ICommand } from "sprotty";
import { Action } from "sprotty-protocol";

type Handler = () => void;

/**
 * Abstract registry which should be used as a base for registries in the container.
 * A registry is supposed to store extra state that is not the diagram model.
 * Examples for such state include diagram options or preferences.
 *
 * The state should be readonly and can only be changed with an {@link Action}.
 * This is similar to the flux architecture that is utilized by Sprotty, where a
 * view dispatches actions, which can change the state, causing the view to react
 * to the changed state and update. Therefore, every registry implements {@link IActionHandler}.
 *
 * Implementations define how their actions are handled and automatically
 * provide a subscription options for listeners, by extending this base class.
 * A handled action should call `notifyListeners` to inform them about state changes.
 *
 * A registry has to be bound to the actions it is supposed to handle in the DI container.
 * Sprotty provides a `configureActionHandler` function to simplify this process.
 */
@injectable()
export abstract class Registry implements IActionHandler {
    protected _listeners: (() => void)[] = [];

    abstract handle(action: Action): void | Action | ICommand;

    onChange(handler: Handler): void {
        this._listeners.push(handler);
    }

    protected notifyListeners(): void {
        for (const listener of this._listeners) {
            listener();
        }
    }
}