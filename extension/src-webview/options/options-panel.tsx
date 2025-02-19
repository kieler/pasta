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

/** @jsx html */
import { VNode } from "snabbdom";
import { html } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { inject, injectable, postConstruct } from "inversify";
import { OptionsRegistry } from "./options-registry";
import { OptionsRenderer } from "./options-renderer";
import { DISymbol } from "../di.symbols";
import { FeatherIcon } from '../feather-icons-snabbdom/feather-icons-snabbdom';
import { SidebarPanel } from "../sidebar";

/** Sidebar panel that displays server provided STPA-DSL options.  */
@injectable()
export class OptionsPanel extends SidebarPanel {
    @inject(DISymbol.OptionsRegistry) private optionsRegistry: OptionsRegistry;
    @inject(DISymbol.OptionsRenderer) private optionsRenderer: OptionsRenderer;

    @postConstruct()
    init(): void {
        this.optionsRegistry.onChange(() => this.update());
    }

    get id(): string {
        return "options-panel";
    }

    get title(): string {
        return "Options";
    }

    render(): VNode {
        return this.optionsRegistry.hasOptions() ? (
            this.optionsRenderer.renderServerOptions({
                synthesisOptions: this.optionsRegistry.valuedSynthesisOptions,
            })
        ) : (
            <span>No options provided by the diagram server.</span>
        );
    }

    get icon(): VNode {
        return <FeatherIcon iconId={"sliders"}/>;
    }
}
