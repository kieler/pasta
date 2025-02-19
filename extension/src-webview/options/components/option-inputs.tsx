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
import { VNode } from "snabbdom";
import { html } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars

type OptionChangeHandler<T> = (newValue: T) => void;

interface BaseProps<T> {
    key?: string;
    id: string;
    name: string;
    value: T;
    description?: string;
    onChange: OptionChangeHandler<T>;
}

type CheckOptionProps = BaseProps<boolean>;

/** Render a labeled checkbox input. */
export function CheckOption(props: CheckOptionProps): VNode {
    return (
        <div class-options__column="true">
            <label htmlFor={props.id} title={props.description ?? props.name}>
                <input
                    class-options__input="true"
                    type="checkbox"
                    title={props.description ?? props.name}
                    id={props.id}
                    checked={props.value}
                    on-change={(): void => props.onChange(!props.value)}
                />
                {props.name}
            </label>
        </div>
    );
}

interface ChoiceOptionProps extends BaseProps<string> {
    availableValues: string[];
    availableValuesLabels?: string[];
}

/** Render a labeled group of radio inputs. */
export function ChoiceOption(props: ChoiceOptionProps): VNode {
    return (
        <div class-options__input-container="true">
            <legend>{props.name}</legend>
            {props.availableValues.map((value, i) => (
                <label key={value} htmlFor={props.availableValuesLabels?.[i] ?? value} title={props.description ?? props.name}>
                    <input
                        class-options__input="true"
                        type="radio"
                        title={props.description ?? props.name}
                        id={props.availableValuesLabels?.[i] ?? value}
                        checked={props.value === value}
                        on-change={(): void => props.onChange(value)}
                    />
                    {props.availableValuesLabels?.[i] ?? value}
                </label>
            ))}
        </div>
    );
}

interface RangeOptionProps extends BaseProps<number> {
    minValue: number;
    maxValue: number;
    stepSize: number;
    /** Same as onChange() but to be executed on each input, i.e. when the slider is held down instead of when it's let go. */
    onInput?: OptionChangeHandler<number>;
}

/** Render a labeled range slider as input. */
export function RangeOption(props: RangeOptionProps): VNode {
    return (
        <div class-options__column="true">
            <label htmlFor={props.id} title={props.description ?? props.name}>
                {props.name}: {props.value}
            </label>
            <input
                class-options__input="true"
                type="range"
                title={props.description ?? props.name}
                id={props.id}
                min={props.minValue}
                max={props.maxValue}
                attrs={{ "value": props.value }}
                step={props.stepSize}
                on-change={(e: any): void => props.onChange(e.target.value)}
                on-input={(e: any): void => props.onInput ? props.onInput(e.target.value) : undefined}
            />
        </div>
    );
}

type TextOptionProps = BaseProps<string>;

/** Renders a labeled text input. */
export function TextOption(props: TextOptionProps): VNode {
    return (
        <div class-options__column="true">
            <label htmlFor={props.id} title={props.description ?? props.name}>{props.name}</label>
            <input
                class-options__input options__text-field="true"
                type="text"
                title={props.description ?? props.name}
                id={props.id}
                value={props.value}
                on-change={(e: any): void => props.onChange(e.target.value)}
            />
        </div>
    );
}

/** Renders a named separator. */
export function SeparatorOption(props: { name: string; key?: string }): VNode {
    return <span class-options__separator="true">{props.name}</span>;
}

interface CategoryOptionProps extends BaseProps<boolean> {
    // While Snabbdom passes the children as a separate param, this children prop is necessary, otherwise TS does complain.
    children?: (VNode | "") | (VNode | "")[];
}

/** Renders a labeled options group. */
export function CategoryOption(props: CategoryOptionProps, children: VNode[]): VNode {
    function handleToggle(e: any): void {
        // The toggle event is also fired if the details are rendered default open.
        // To prevent an infinite toggle loop, change is only called if the state has really changed.
        if (e.target.open !== props.value) props.onChange(e.target.open);
    }

    return (
        <details open={props.value} class-options__category="true" on-toggle={handleToggle}>
            <summary title={props.description ?? props.name}>
                {props.name}
            </summary>
            {children}
        </details>
    );
}

/**
 * Properties for dropdown menus.
 */
interface DropDownMenuProps extends BaseProps<string> {
    currentId: string;
    availableValues: { displayName: string; id: string }[];
    onChange: (newValue: string) => void;
}

/** Renders a dropdown menu. */
export function DropDownMenuOption(props: DropDownMenuProps): VNode {
    return (
        <div class-options__column="true">
            <label htmlFor="itemSelect">{props.name}</label>
            <select id="itemSelect" class-options__selection="true" on-change={(e: any): void => props.onChange(e.target.value)}>
                {props.availableValues.map((item) => (
                    <option value={item.id} selected={item.id === props.currentId}>
                        {item.displayName}
                    </option>
                ))}
            </select>
        </div>
    );
}
