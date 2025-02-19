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

import { Reference } from "langium";
import { LangiumSprottySharedServices } from "langium-sprotty";
import { URI } from "vscode-uri";
import { DCARule, Model, Rule, Variable, VariableValue, isRule } from "../../generated/ast.js";
import { getModel } from "../../utils.js";

/**
 * Respresents an LTL formula.
 */
class LTLFormula {
    /** LTL formula */
    formula: string;
    /** description of the LTL formula */
    description: string;
    /** UCA that was used to create the LTL formula */
    ucaId: string;

    contextVariables: string;
    type: string;
}

/**
 * Provides the different UCA types. WRONG_TIME can be used to indicate too-early or too-late.
 */
class UCA_TYPE {
    static NOT_PROVIDED = "not-provided";
    static PROVIDED = "provided";
    static TOO_EARLY = "too-early";
    static TOO_LATE = "too-late";
    static APPLIED_TOO_LONG = "applied-too-long";
    static STOPPED_TOO_SOON = "stopped-too-soon";
    static WRONG_TIME = "wrong-time";
    static UNDEFINED = "undefined";
}

/**
 * Operator strings.
 */
const GT = ">";
const LT = "<";
const GTE = ">=";
const LTE = "<=";
const EQ = "==";
const NEQ = "!=";

/**
 * Generates the LTL formulae for the UCAs in the file given by {@code uri}.
 * @param uri URI of the file for which the LTL should be generated.
 * @param shared Langium/Sprotty services.
 * @returns LTL formulae for the UCAs in the given model.
 */
export async function generateLTLFormulae(
    uri: string,
    shared: LangiumSprottySharedServices
): Promise<Record<string, LTLFormula[]>> {
    // get the current model
    let model = await getModel(uri, shared) as Model;

    // references are not found if the stpa file has not been opened since then the linter has not been activated yet
    if (model.rules.length > 0 && model.rules[0]?.contexts[0]?.assignedValues[0]?.variable.ref === undefined) {
        // build document
        await shared.workspace.DocumentBuilder.update([URI.parse(uri)], []);
        // update the model
        model = await getModel(uri, shared)  as Model;
    }
    // ltl formulas are saved per controller
    const map: Record<string, LTLFormula[]> = {};
    await translateUCAsToLTLFormulas(model, map);
    await translateDCAsToLTLFormulas(model, map);
    return map;
}

/**
 * Translates the DCAs of the given model to LTL formulae.
 * @param model The model containing the DCAs that should be translated.
 * @param map Map containing the LTL formulae for the controllers of the model.
 */
async function translateDCAsToLTLFormulas(model: Model, map: Record<string, LTLFormula[]>): Promise<void> {
    if (model.allDCAs.length > 0 && model.allDCAs) {
        for (const rule of model.allDCAs) {
            await translateRuleToLTLFormulas(rule, map);
        }
    }
}

/**
 * Translates the UCAs of the given model to LTL formulae.
 * @param model The model containing the UCAs that should be translated.
 * @param map Map containing the LTL formulae for the controllers of the model.
 */
async function translateUCAsToLTLFormulas(model: Model, map: Record<string, LTLFormula[]>): Promise<void> {
    if (model.rules.length > 0 && model.rules) {
        for (const rule of model.rules) {
            await translateRuleToLTLFormulas(rule, map);
        }
    }
}

/**
 * Translates the given rule to LTL formulae.
 * @param rule The rule that should be translated.
 * @param map Map containing the LTL formulae for the controllers of the model.
 */
async function translateRuleToLTLFormulas(rule: Rule | DCARule, map: Record<string, LTLFormula[]>): Promise<void> {
    const controller = rule.system.$refText;
    // control action string
    const controlAction = controller + "." + rule.action.$refText;
    for (const uca of rule.contexts) {
        // calculate the contextVariable string
        let contextVariables = await createLTLContextVariable(uca.assignedValues[0].variable, uca.assignedValues[0].value.$refText);
        for (let i = 1; i < uca.assignedValues.length; i++) {
            contextVariables += "&&" + (await createLTLContextVariable(uca.assignedValues[i].variable, uca.assignedValues[i].value.$refText));
        }
        // translate uca based on the rule type
        const ltlString = createLTLString(rule, contextVariables, controlAction);
        const ltlFormula = {
            formula: ltlString.formula,
            description: ltlString.description,
            ucaId: uca.name,
            contextVariables,
            type: ltlString.type,
        };
        // add ltl to the map based on the controller reponsible for the UCA
        const ltlList = map[controller];
        if (ltlList !== undefined) {
            ltlList.push(ltlFormula);
        } else {
            map[controller] = [ltlFormula];
        }
    }
}

/**
 * Creates a string of a context variable value for the LTL formula.
 * @param variable Reference to a variable that should be translated to an LTL formula string.
 * @param value Value of the variable.
 * @returns the string for the currently inspected context variable.
 */
async function createLTLContextVariable(variable: Reference<Variable>, value: string): Promise<string> {
    // range definition of the used variable value in the UCA
    const valueRange = variable.ref?.values?.find((variableRange) => variableRange.name === value);
    if (valueRange === undefined || valueRange?.firstValue === undefined) {
        // no value range defined for the value
        return enumValue(variable.$refText, value);
    } else {
        const equal = valueRange?.operator === "=";
        if (valueRange.secondValue === undefined) {
            // only one value is given
            if (valueRange.firstValue === "false" || valueRange.firstValue === "true") {
                // given value is a boolean
                return booleanValue(
                    variable.$refText,
                    (equal && valueRange.firstValue === "true") ||
                        (valueRange?.operator === "!=" && valueRange.firstValue === "false")
                );
            } else {
                // given value is string or number
                return oneValue(variable.$refText, "" + valueRange.firstValue, equal);
            }
        } else {
            if (valueRange.firstValue === "MIN") {
                // MIN value is used
                return minAsRangeValue(
                    variable.$refText,
                    "" + valueRange.secondValue,
                    equal,
                    isParenthesisInclusive(valueRange.secondParenthesis)
                );
            } else if (valueRange.secondValue === "MAX") {
                // MAX value is used
                return maxAsRangeValue(
                    variable.$refText,
                    "" + valueRange.firstValue,
                    equal,
                    isParenthesisInclusive(valueRange.firstParenthesis)
                );
            } else {
                // two range values are given without use of MIN or MAX
                return twoRanges(variable.$refText, valueRange, equal);
            }
        }
    }
}

/**
 * Checks whether the parenthesis of the given value are inclusive or exclusive.
 * @param value The value to check.
 * @returns true if the parenthesis are inclusive, false otherwise.
 */
function isParenthesisInclusive(value: string | undefined): boolean {
    return value === "]" || value === "[";
}

/**
 * An LTL string for a variable which value should be in a given range or outside of it.
 * @param variable The variable to create the LTL string for.
 * @param valueRange The value range of the variable.
 * @param equal Determines whether the variable should be in the given range or outside of it.
 * @returns the LTL string for the given variable.
 */
const twoRanges = (variable: string, valueRange: VariableValue, equal: boolean): string => {
    return (
        variable +
        determineOperator(equal, isParenthesisInclusive(valueRange.firstParenthesis), true) +
        valueRange.firstValue +
        " && " +
        variable +
        determineOperator(equal, isParenthesisInclusive(valueRange.secondParenthesis), false) +
        valueRange.secondValue
    );
};
/**
 * An LTL string for a variable which value should be in or outside of a given range in which a MAX value is used as second value of the range.
 * @param variable The variable to create the LTL string for.
 * @param value The first value of the range.
 * @param equal Determines whether the variable should be in the given range or outside of it.
 * @returns the LTL string for the given variable.
 */
const maxAsRangeValue = (variable: string, value: string, equal: boolean, inclusive: boolean): string => {
    return variable + determineOperator(equal, inclusive, true) + value;
};
/**
 * An LTL string for a variable which value should be in or outside of a given range in which a MIN value is used as first value of the range.
 * @param variable The variable to create the LTL string for.
 * @param value The second value of the range.
 * @param equal Determines whether the variable should be in the given range or outside of it.
 * @returns the LTL string for the given variable.
 */
const minAsRangeValue = (variable: string, value: string, equal: boolean, inclusive: boolean): string => {
    return variable + determineOperator(equal, inclusive, false) + value;
};
/**
 * An LTL string for a variable which value is a boolean.
 * @param variable The variable to create the LTL string for.
 * @param equal Determines whether the variable should be true or false.
 * @returns the LTL string for the given variable.
 */
const booleanValue = (variable: string, equal: boolean): string => {
    return (equal ? "" : "!") + variable;
};
/**
 * An LTL string for a variable with a given value.
 * @param variable The variable to create the LTL string for.
 * @param value The value of the variable.
 * @param equal Determines whether the variable should be (un)equal to the value.
 * @returns the LTL string for the given variable.
 */
const oneValue = (variable: string, value: string, equal: boolean): string => {
    return variable + (equal ? EQ : NEQ) + value;
};
/**
 * An LTL string for a variable with a given enum value.
 * @param variable The variable to create the LTL string for.
 * @param value The enum value of the variable.
 * @returns the LTL string for the given variable.
 */
const enumValue = (variable: string, value: string): string => {
    return variable + EQ + variable + "_Enum." + value;
};

/**
 * Determines the operator for the LTL string.
 * @param equal Determines whether the variable should be (un)equal to the value.
 * @param inclusive Determines whether the variable should be in the given range or outside of it.
 * @param first Determines whether the first value is greater or smaller than the second value when equal is true.
 * @returns
 */
function determineOperator(equal: boolean, inclusive: boolean, first: boolean): string {
    if (equal && first) {
        return inclusive ? GTE : GT;
    } else if (equal && !first) {
        return inclusive ? LTE : LT;
    } else if (!equal && first) {
        return inclusive ? LT : LTE;
    } else {
        return inclusive ? GT : GTE;
    }
}

/**
 * Creates the LTL string for the given arguments.
 * @param rule The rule that should be translated to an LTL.
 * @param contextVariables The string for the context variable values.
 * @param controlAction The controlaction for the rule.
 * @returns the LTL for the given arguments.
 */
function createLTLString(
    rule: Rule | DCARule,
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } {
    if (isRule(rule)) {
        switch (rule.type) {
            case UCA_TYPE.NOT_PROVIDED:
                return notProvidedLTL(contextVariables, controlAction);
            case UCA_TYPE.PROVIDED:
                return providedLTL(contextVariables, controlAction);
            case UCA_TYPE.TOO_EARLY:
                return tooEarlyLTL(contextVariables, controlAction);
            case UCA_TYPE.TOO_LATE:
                return tooLateLTL(contextVariables, controlAction);
            case UCA_TYPE.APPLIED_TOO_LONG:
                return appliedTooLongLTL(contextVariables, controlAction);
            case UCA_TYPE.STOPPED_TOO_SOON:
                return stoppedTooSoonLTL(contextVariables, controlAction);
            case UCA_TYPE.WRONG_TIME:
                return wrongTimeLTL(contextVariables, controlAction);
            default:
                return { formula: "", description: "", type: UCA_TYPE.UNDEFINED };
        }
    } else {
        switch (rule.type) {
            case UCA_TYPE.NOT_PROVIDED:
                return providedLTL(contextVariables, controlAction);
            case UCA_TYPE.PROVIDED:
                return notProvidedLTL(contextVariables, controlAction);
            default:
                return { formula: "", description: "", type: UCA_TYPE.UNDEFINED };
        }
    }
}

/**
 * LTL formula for the not provided rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the not provided rule type and a textual representation.
 */
const notProvidedLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    return {
        formula: "G ((" + contextVariables + ") -> (controlAction==" + controlAction + "))",
        description: controlAction + " provided in context " + contextVariables,
        type: UCA_TYPE.NOT_PROVIDED,
    };
};
/**
 * LTL formula for the provided rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the provided rule type and a textual representation.
 */
const providedLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    return {
        formula: "G ((" + contextVariables + ") -> (controlAction!=" + controlAction + "))",
        description: controlAction + " not provided in context " + contextVariables,
        type: UCA_TYPE.PROVIDED,
    };
};
/**
 * LTL formula for the too early rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the too eraly rule type and a textual representation.
 */
const tooEarlyLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    return {
        formula:
            "G ((!(" +
            contextVariables +
            ") && X(" +
            contextVariables +
            ")) -> (controlAction!=" +
            controlAction +
            "))",
        description: controlAction + " not provided too early in context " + contextVariables,
        type: UCA_TYPE.TOO_EARLY,
    };
};
/**
 * LTL formula for the too late rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the too late rule type and a textual representation.
 */
const tooLateLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    return {
        // formula: "G (((" + contextVariables + ") -> (controlAction==" + controlAction + ")) && !((" + contextVariables + ")U(controlAction==" + controlAction + ")))",
        formula:
            "((" +
            contextVariables +
            ") -> (controlAction==" +
            controlAction +
            ")) && G ((!(" +
            contextVariables +
            ")) -> (X((" +
            contextVariables +
            ") -> (controlAction==" +
            controlAction +
            "))))",
        description: controlAction + " not provided too late in context " + contextVariables,
        type: UCA_TYPE.TOO_LATE,
    };
};
/**
 * LTL formula for the appplied too long rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the applied too long rule type and a textual representation.
 */
const appliedTooLongLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    return {
        formula:
            "G ((" +
            contextVariables +
            " && controlAction==" +
            controlAction +
            ") -> (X((!(" +
            contextVariables +
            ")) -> controlAction!=" +
            controlAction +
            ")))",
        description: controlAction + " not applied too long in context " + contextVariables,
        type: UCA_TYPE.APPLIED_TOO_LONG,
    };
};
/**
 * LTL formula for the stopped too soon rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the stopped too soon rule type and a textual representation.
 */
const stoppedTooSoonLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    return {
        formula:
            "G ((" +
            contextVariables +
            " && controlAction==" +
            controlAction +
            ") -> (X((controlAction!=" +
            controlAction +
            ") -> (!(" +
            contextVariables +
            ")))))",
        description: controlAction + " not stopped too soon in context " + contextVariables,
        type: UCA_TYPE.STOPPED_TOO_SOON,
    };
};
/**
 * LTL formula for the wrong time rule type.
 * @param contextVariables The used context variables that are already translated to string for the LTL formula.
 * @param controlAction The inspected control action that is already translated to string for the LTL formula.
 * @returns the LTL formula for the wrong time rule type and a textual representation.
 */
const wrongTimeLTL = (
    contextVariables: string,
    controlAction: string
): { formula: string; description: string; type: string } => {
    const tooEarly = tooEarlyLTL(contextVariables, controlAction);
    const tooLate = tooLateLTL(contextVariables, controlAction);
    return {
        formula: tooEarly.formula + " && " + tooLate.formula,
        description: controlAction + " not provided at the wrong time in context " + contextVariables,
        type: UCA_TYPE.WRONG_TIME,
    };
};
