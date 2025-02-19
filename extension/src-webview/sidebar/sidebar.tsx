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
import { inject, postConstruct } from "inversify";
import { VNode } from "snabbdom";
import { AbstractUIExtension, html, IActionDispatcher, Patcher, PatcherProvider, TYPES } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { ShowSidebarAction, ToggleSidebarPanelAction } from "./actions";
import { DISymbol } from "../di.symbols";
import { SidebarPanelRegistry } from "./sidebar-panel-registry";

/**
 * UIExtension that adds a sidebar to the Sprotty container. The content of the
 * sidebar is implemented by panels, which are provided separately. The sidebar
 * reacts to updates of the {@link SidebarPanelRegistry} and syncs the UI with
 * the registry state.
 */
export class Sidebar extends AbstractUIExtension {
    static readonly ID = "sidebar";

    /** Snabbdom patcher function and VDom root */
    private patcher: Patcher;
    private oldPanelContentRoot: VNode;

    @inject(TYPES.PatcherProvider) patcherProvider: PatcherProvider;
    @inject(TYPES.IActionDispatcher) private actionDispatcher: IActionDispatcher;
    @inject(DISymbol.SidebarPanelRegistry) private sidebarPanelRegistry: SidebarPanelRegistry;

    @postConstruct()
    init(): void {
        this.actionDispatcher.dispatch(ShowSidebarAction.create());
        this.patcher = this.patcherProvider.patcher;

        // Update the panel if the registry state changes
        this.sidebarPanelRegistry.onChange(() => this.update());

        // Update the panel if the current panel requests an update
        this.sidebarPanelRegistry.allPanels.forEach((panel) => {
            panel.onUpdate(() => {
                if (panel.id === this.sidebarPanelRegistry.currentPanelID) this.update();
            });
        });
    }

    id(): string {
        return Sidebar.ID;
    }

    containerClass(): string {
        return Sidebar.ID;
    }

    update(): void {
        // Only update if the content was initialized, which is the case if a
        // VNode Root for the panel content is created.
        if (!this.oldPanelContentRoot) return;

        console.time("sidebar-update");
        const currentPanel = this.sidebarPanelRegistry.currentPanel;

        const content: VNode = (
            <div class-sidebar__content="true">
                <div class-sidebar__toggle-container="true">
                    {this.sidebarPanelRegistry.allPanels.map((panel) => (
                        <button
                            class-sidebar__toggle-button="true"
                            class-sidebar__toggle-button--active={
                                this.sidebarPanelRegistry.currentPanelID === panel.id
                            }
                            title={panel.title}
                            on-click={this.handlePanelButtonClick.bind(this, panel.id)}
                        >
                            {panel.icon}
                        </button>
                    ))}
                </div>
                <h3 class-sidebar__title="true">{currentPanel?.title ?? ""}</h3>
                <div class-sidebar__panel-content="true">{currentPanel?.render() ?? ""}</div>
            </div>
        );

        // Update panel content with efficient VDOM patching.
        this.oldPanelContentRoot = this.patcher(this.oldPanelContentRoot, content);

        // Show or hide the panel
        if (currentPanel) {
            this.containerElement.classList.add("sidebar--open");
        } else {
            this.containerElement.classList.remove("sidebar--open");
        }
        console.timeEnd("sidebar-update");
    }

    protected onBeforeShow(): void {
        this.update();
    }

    protected initializeContents(containerElement: HTMLElement): void {
        // Prepare the virtual DOM. Snabbdom requires an empty element.
        // Furthermore, the element is completely replaced by the panel on every update,
        // so we use an extra, empty element to ensure that we do not loose important attributes (such as classes).
        const panelContentRoot = document.createElement("div");
        this.oldPanelContentRoot = this.patcher(panelContentRoot, <div />);
        containerElement.appendChild(panelContentRoot);

        // Notice that an AbstractUIExtension only calls initializeContents once,
        // so this handler is also only registered once.
        this.addClickOutsideListenser(containerElement);
    }

    private handlePanelButtonClick(id: string): void {
        this.actionDispatcher.dispatch(ToggleSidebarPanelAction.create(id));
    }

    /**
     * Register a click outside handler that hides the content when a user click outsides.
     * Using "mousedown" instead of "click" also hides the panel as soon as the user starts
     * dragging the diagram.
     */
    private addClickOutsideListenser(containerElement: HTMLElement): void {
        document.addEventListener("mousedown", (e) => {
            const currentPanelID = this.sidebarPanelRegistry.currentPanelID;

            // See for information on detecting "click outside": https://stackoverflow.com/a/64665817/7569889
            if (!currentPanelID || e.composedPath().includes(containerElement)) return;

            this.actionDispatcher.dispatch(ToggleSidebarPanelAction.create(currentPanelID, "hide"));
        });
    }
}