/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2022 by
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
import { IActionDispatcher, TYPES, html } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { UpdateModelAction } from 'sprotty-protocol';
import {
    SetRenderOptionAction,
    SetSynthesisOptionsAction
} from "./actions";
import {
    CategoryOption,
    CheckOption, ChoiceOption, DropDownMenuOption, RangeOption, SeparatorOption, TextOption,
} from "./components/option-inputs";
import {
    ChoiceRenderOption,
    DropDownOption,
    RangeOption as RangeOptionData,
    RenderOption,
    SynthesisOption,
    TransformationOptionType
} from "./option-models";

interface AllOptions {
    synthesisOptions: SynthesisOption[];
}

/** Renderer that is capable of rendering different option models to jsx. */
@injectable()
export class OptionsRenderer {
    @inject(TYPES.IActionDispatcher) protected actionDispatcher: IActionDispatcher;

    /**
     * Renders all diagram options that are provided by the server. This includes
     * at the moment only the synthesis options.
     */
    renderServerOptions(options: AllOptions): VNode {
        return (
            <div class-options="true">
                {options.synthesisOptions.length === 0 ? (
                    ""
                ) : (
                    <div class-options__section="true">
                        <h5 class-options__heading="true">Synthesis Options</h5>
                        {this.renderSynthesisOptions(options.synthesisOptions, null)}
                    </div>
                )}
            </div>
        );
    }

    /**
     * Renders all synthesis options that are part of a given category. Renders all
     * synthesisOptions that belong to no category if the category is null.
     */
    private renderSynthesisOptions(synthesisOptions: SynthesisOption[], category: SynthesisOption | null): (VNode | "")[] | "" {
        return synthesisOptions
            .filter((option) => option.category?.id === category?.id)
            .map((option) => {
                switch (option.type) {
                    case TransformationOptionType.CHECK:
                        return (
                            <CheckOption
                                key={option.id}
                                id={option.id}
                                name={option.name}
                                value={option.currentValue}
                                description={option.description}
                                onChange={this.handleSynthesisOptionChange.bind(this, option)}
                            />
                        );
                    case TransformationOptionType.CHOICE:
                        return (
                            <ChoiceOption
                                key={option.id}
                                id={option.id}
                                name={option.name}
                                value={option.currentValue}
                                availableValues={option.values}
                                description={option.description}
                                onChange={this.handleSynthesisOptionChange.bind(this, option)}
                            />
                        );
                    case TransformationOptionType.RANGE:
                        return (
                            <RangeOption
                                key={option.id}
                                id={option.id}
                                name={option.name}
                                value={option.currentValue}
                                minValue={(option as RangeOptionData).range.first}
                                maxValue={(option as RangeOptionData).range.second}
                                stepSize={(option as RangeOptionData).stepSize}
                                description={option.description}
                                onChange={this.handleSynthesisOptionChange.bind(this, option)}
                                onInput={this.handleSynthesisOptionInput.bind(this, option)}
                            />
                        );
                    case TransformationOptionType.TEXT:
                        return (
                            <TextOption
                                key={option.id}
                                id={option.id}
                                name={option.name}
                                value={option.currentValue}
                                description={option.description}
                                onChange={this.handleSynthesisOptionChange.bind(this, option)}
                            />
                        );
                    case TransformationOptionType.SEPARATOR:
                        return <SeparatorOption key={option.id} name={option.name} />;
                    case TransformationOptionType.CATEGORY:
                        return (
                            <CategoryOption
                                key={option.id}
                                id={option.id}
                                name={option.name}
                                value={option.currentValue}
                                description={option.description}
                                onChange={this.handleSynthesisOptionChange.bind(this, option)}
                            >
                                {/* Skip rendering the children if the category is closed */}
                                {!option.currentValue
                                    ? ""
                                    : this.renderSynthesisOptions(synthesisOptions, option)}
                            </CategoryOption>
                        );
                    case TransformationOptionType.DROPDOWN:
                        return (
                            <DropDownMenuOption
                                key={option.id}
                                id={option.id}
                                currentId={(option as DropDownOption).currentId}
                                name={option.name}
                                value={option.currentValue}
                                availableValues={(option as DropDownOption).availableValues}
                                description={option.description}
                                onChange={this.handleSynthesisOptionChange.bind(this, option)}
                            />
                        );
                    default:
                        console.error("Unsupported option type for option:", option.name);
                        return "";
                }
            });
    }

    /** Handler for synthesis options onInput, e.g. while a slider is being dragged. */
    private handleSynthesisOptionInput(option: SynthesisOption, newValue: any): void {
        this.actionDispatcher.dispatch(
            SetSynthesisOptionsAction.create([{ ...option, currentValue: newValue }])
        );
    }

    private handleSynthesisOptionChange(option: SynthesisOption, newValue: any): void {
        this.actionDispatcher.dispatch(
            SetSynthesisOptionsAction.create([{ ...option, currentValue: newValue }])
        );
    }

    /** Renders render options that are stored in the client. */
    renderRenderOptions(renderOptions: RenderOption[]): (VNode | "")[] | "" {
        if (renderOptions.length === 0) return "";

        return renderOptions.map((option) => {
            switch (option.type) {
                case TransformationOptionType.CHECK:
                    return (
                        <CheckOption
                            key={option.id}
                            id={option.id}
                            name={option.name}
                            value={option.currentValue}
                            description={option.description}
                            onChange={this.handleRenderOptionChange.bind(this, option)}
                        />
                    );
                case TransformationOptionType.CHOICE:
                    return (
                        <ChoiceOption
                            key={option.id}
                            id={option.id}
                            name={option.name}
                            value={option.currentValue}
                            description={option.description}
                            onChange={this.handleRenderOptionChange.bind(this, option)}
                            availableValues={(option as ChoiceRenderOption).availableValues}
                        />
                    );
                case TransformationOptionType.DROPDOWN:
                    return (
                        <DropDownMenuOption
                            key={option.id}
                            id={option.id}
                            currentId={(option as DropDownOption).currentId}
                            name={option.name}
                            value={option.currentValue}
                            availableValues={(option as DropDownOption).availableValues}
                            description={option.description}
                            onChange={this.setCurrentValueOnChange.bind(this, option)}
                        />
                    );
                default:
                    console.error("Unsupported option type for option:", option.name);
                    return "";
            }
        });
    }

    private handleRenderOptionChange(option: RenderOption, newValue: any): void {
        this.actionDispatcher.dispatch(SetRenderOptionAction.create(option.id, newValue));
    }

    private setCurrentValueOnChange(option: RenderOption, newValue: any): void {
        option.currentValue = { displayName: newValue, id: newValue };
        this.actionDispatcher.dispatch(UpdateModelAction.create([], { animate: false }));
    }
}
