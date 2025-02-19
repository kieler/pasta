/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2023 by
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

import { Action, CollapseExpandAction, CollapseExpandAllAction, DiagramServices, JsonMap, RequestAction, RequestModelAction, ResponseAction } from "sprotty-protocol";
import { Connection } from "vscode-languageserver";
import { FtaServices } from "./fta/fta-module.js";
import { SetSynthesisOptionsAction, UpdateOptionsAction } from "./options/actions.js";
import { DropDownOption } from "./options/option-models.js";
import { SnippetDiagramServer } from "./snippets/snippet-diagram-server.js";
import { LanguageSnippet } from "./snippets/snippet-model.js";
import { StpaDiagramSnippets } from "./snippets/stpa-snippets.js";
import { GenerateSVGsAction, RequestSvgAction, SvgAction, UpdateDiagramAction } from "./stpa/actions.js";
import { StpaSynthesisOptions, filteringUCAsID } from "./stpa/diagram/stpa-synthesis-options.js";
import {
    COMPLETE_GRAPH_PATH,
    CONTROL_STRUCTURE_PATH,
    FILTERED_CONTROLLER_CONSTRAINT_PATH,
    FILTERED_SCENARIO_PATH,
    FILTERED_UCA_PATH,
    HAZARD_PATH,
    RESPONSIBILITY_PATH,
    SAFETY_REQUIREMENT_PATH,
    SCENARIO_WITH_HAZARDS_PATH,
    SYSTEM_CONSTRAINT_PATH,
    resetOptions,
    saveOptions,
    setAllScenariosOptions,
    setControlStructureOptions,
    setControllerConstraintWithFilteredUcaGraphOptions,
    setFilteredUcaGraphOptions,
    setHazardGraphOptions,
    setRelationshipGraphOptions,
    setResponsibilityGraphOptions,
    setSafetyRequirementGraphOptions,
    setScenarioWithFilteredUCAGraphOptions,
    setScenarioWithNoUCAGraphOptions,
    setSystemConstraintGraphOptions,
} from "./stpa/result-report/svg-generator.js";
import { StpaServices } from "./stpa/stpa-module.js";
import { SynthesisOptions } from "./synthesis-options.js";

// matches id of a node to its expansion state. True means expanded, false and undefined means collapsed
export let expansionState = new Map<string, boolean>();

export class PastaDiagramServer extends SnippetDiagramServer {
    protected synthesisOptions: SynthesisOptions | undefined;
    protected stpaSnippets: StpaDiagramSnippets | undefined;
    protected connection: Connection | undefined;

    constructor(
        dispatch: <A extends Action>(action: A) => Promise<void>,
        services: DiagramServices,
        clientId: string,
        options: JsonMap | undefined,
        connection: Connection | undefined,
        language: StpaServices | FtaServices
    ) {
        super(
            dispatch,
            services,
            clientId,
            language.hasOwnProperty("snippets") && (language as StpaServices).snippets.StpaDiagramSnippets.getSnippets()
                ? (language as StpaServices).snippets.StpaDiagramSnippets.getSnippets()
                : [],
            options,
            connection
        );
        // only STPAService has snippets
        if (language.hasOwnProperty("snippets")) {
            this.stpaSnippets = (language as StpaServices).snippets.StpaDiagramSnippets;
        }
        this.synthesisOptions = language.options.SynthesisOptions;
        this.clientId = clientId;
        this.connection = connection;
    }

    accept(action: Action): Promise<void> {
        console.log("received from client: " + action.kind);
        return super.accept(action);
    }

    request<Res extends ResponseAction>(action: RequestAction<Res>): Promise<Res> {
        console.log("request send from server to client: " + action.kind);
        return super.request(action);
    }

    protected handleAction(action: Action): Promise<void> {
        switch (action.kind) {
            case SetSynthesisOptionsAction.KIND:
                return this.handleSetSynthesisOption(action as SetSynthesisOptionsAction);
            case GenerateSVGsAction.KIND:
                return this.handleGenerateSVGDiagrams(action as GenerateSVGsAction);
            case UpdateDiagramAction.KIND:
                return this.updateView(this.state.options);
            case CollapseExpandAction.KIND:
                return this.collapseExpand(action as CollapseExpandAction);
            case CollapseExpandAllAction.KIND:
                // TODO: create buttons in sidepanel to send this action and implement the reaction to it
                console.log("received collapse/expand all action");
        }
        return super.handleAction(action);
    }

    /**
     * Collapses and expands the nodes with the given ids and updates the view.
     * @param action The CollapseExpandAction that triggered this method.
     * @returns 
     */
    protected collapseExpand(action: CollapseExpandAction): Promise<void> {
        for (const id of action.expandIds) {
            expansionState.set(id, true);
        }
        for (const id of action.collapseIds) {
            expansionState.set(id, false);
        }
        return this.updateView(this.state.options);
    }

    /**
     * Creates a snippet from a string.
     * @param text The text that should be inserted when clicking on the snippet.
     * @returns a snippet for the given {@code text}
     */
    protected createSnippetFromString(text: string): LanguageSnippet {
        return this.stpaSnippets?.createSnippet(text) ?? ({} as LanguageSnippet);
    }

    /**
     * Generates the diagrams for the STPA results by setting the synthesis options
     * accordingly and requesting the SVG from the client.
     *
     * @param action The action that triggered this method.
     * @returns
     */
    async handleGenerateSVGDiagrams(action: GenerateSVGsAction): Promise<void> {
        if (this.synthesisOptions && this.synthesisOptions instanceof StpaSynthesisOptions) {
            diagramSizes = {};
            const setSynthesisOption = {
                kind: SetSynthesisOptionsAction.KIND,
                options: this.synthesisOptions.getSynthesisOptions().map(option => option.synthesisOption),
            } as SetSynthesisOptionsAction;
            // save current option values
            saveOptions(this.synthesisOptions);
            // control structure svg
            setControlStructureOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, CONTROL_STRUCTURE_PATH);
            // hazard graph svg
            setHazardGraphOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, HAZARD_PATH);
            // system constraint graph svg
            setSystemConstraintGraphOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, SYSTEM_CONSTRAINT_PATH);
            // responsibility graph svg
            setResponsibilityGraphOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, RESPONSIBILITY_PATH);

            // filtered uca graph svg
            const filteringUcaOption = this.synthesisOptions
                .getSynthesisOptions()
                .find(option => option.synthesisOption.id === filteringUCAsID);
            for (const value of (filteringUcaOption?.synthesisOption as DropDownOption).availableValues) {
                setFilteredUcaGraphOptions(this.synthesisOptions, value.id);
                await this.createSVG(setSynthesisOption, action.uri, FILTERED_UCA_PATH(value.id));
            }

            // filtered controller constraint graph svg
            for (const value of (filteringUcaOption?.synthesisOption as DropDownOption).availableValues) {
                setControllerConstraintWithFilteredUcaGraphOptions(this.synthesisOptions, value.id);
                await this.createSVG(setSynthesisOption, action.uri, FILTERED_CONTROLLER_CONSTRAINT_PATH(value.id));
            }

            // filtered scenario graph svg
            for (const value of (filteringUcaOption?.synthesisOption as DropDownOption).availableValues) {
                setScenarioWithFilteredUCAGraphOptions(this.synthesisOptions, value.id);
                await this.createSVG(setSynthesisOption, action.uri, FILTERED_SCENARIO_PATH(value.id));
            }
            // scenario with hazard svg graph
            setScenarioWithNoUCAGraphOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, SCENARIO_WITH_HAZARDS_PATH);
            // all scenarios svg graph
            setAllScenariosOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, FILTERED_SCENARIO_PATH("all UCAs"));

            // safety requirement svg graph
            setSafetyRequirementGraphOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, SAFETY_REQUIREMENT_PATH);
            // complete graph svg
            setRelationshipGraphOptions(this.synthesisOptions);
            await this.createSVG(setSynthesisOption, action.uri, COMPLETE_GRAPH_PATH);
            // reset options
            resetOptions(this.synthesisOptions);
            await this.handleSetSynthesisOption(setSynthesisOption);
        }

        return Promise.resolve();
    }

    /**
     * Creates an SVG by sending the {@code action} to the client and then requesting the SVG. The SVG is then send to the extension with the uri where to save it.
     * @param action The action to set the synthesis options for the wanted diagram.
     * @param uri The uri of the folder where the SVG should be saved.
     * @param id The name of the SVG.
     */
    protected async createSVG(action: SetSynthesisOptionsAction | undefined, uri: string, id: string): Promise<void> {
        if (action) {
            // wait for client to apply the new synthesis option values
            await this.handleSetSynthesisOption(action);
            // request SVG
            const request = RequestSvgAction.create();
            const response = await this.request<SvgAction>(request);
            // save the width of the SVG
            diagramSizes[id] = response.width;
            // send SVG to the extension
            this.connection?.sendNotification("svg", { uri: uri + id, svg: response.svg });
        }
    }

    protected async handleSetSynthesisOption(action: SetSynthesisOptionsAction): Promise<void> {
        if (this.synthesisOptions) {
            for (const option of action.options) {
                const opt = this.synthesisOptions
                    .getSynthesisOptions()
                    .find(synOpt => synOpt.synthesisOption.id === option.id);
                if (opt) {
                    opt.currentValue = option.currentValue;
                    opt.synthesisOption.currentValue = option.currentValue;
                    // for dropdown menu options more must be done
                    if ((opt.synthesisOption as DropDownOption).currentId) {
                        (opt.synthesisOption as DropDownOption).currentId = option.currentValue;
                        this.dispatch({
                            kind: UpdateOptionsAction.KIND,
                            valuedSynthesisOptions: this.synthesisOptions.getSynthesisOptions(),
                            clientId: this.clientId,
                        });
                    }
                }
            }
            await this.updateView(this.state.options);
        }
        return Promise.resolve();
    }

    protected async updateView(options: JsonMap | undefined): Promise<void> {
        this.state.options = options;
        try {
            const newRoot = await this.diagramGenerator.generate({
                options: this.state.options ?? {},
                state: this.state,
            });
            // only update the view if the new root has children, otherwise an error occured
            if (newRoot.children?.length !== 0) {
                newRoot.revision = ++this.state.revision;
                this.state.currentRoot = newRoot;
                await this.submitModel(this.state.currentRoot, true);
                // ensures the the filterUCA option is correct
                this.dispatch({
                    kind: UpdateOptionsAction.KIND,
                    valuedSynthesisOptions: this.synthesisOptions?.getSynthesisOptions() ?? [],
                    clientId: this.clientId,
                });
            }
        } catch (err) {
            this.rejectRemoteRequest(undefined, err as Error);
            console.error("Failed to generate diagram:", err);
        }
    }

    protected async handleRequestModel(action: RequestModelAction): Promise<void> {
        await super.handleRequestModel(action);
        this.dispatch({
            kind: UpdateOptionsAction.KIND,
            valuedSynthesisOptions: this.synthesisOptions?.getSynthesisOptions() ?? [],
            clientId: this.clientId,
        });
    }
}

export let diagramSizes: Record<string, number> = {};
