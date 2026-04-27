/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022 by
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

import { Rule } from "../src-language-server/generated/ast";
import { RuleTypeMapping } from "./utils-classes";

/** The type of a rule as defined in the grammar. */
export type RuleType = Rule['type'];

/** These strings MUST match the Langium grammar exactly */
export const RULE_TYPE_MAPPINGS: RuleTypeMapping[] = [
    {
        header: "Anytime",
        ruleTypes: ["provided"],
        index: 0
    },
    {
        header: "Too Early / Too Late",
        ruleTypes: ["too-early", "too-late", "wrong-time"],
        index: 1
    },
    {
        header: "Stopped Too Soon / Applied Too Long",
        ruleTypes: ["stopped-too-soon", "applied-too-long"],
        index: 2
    },
    {
        header: "Never",
        ruleTypes: ["not-provided"], 
        index: 3
    }
];

/** All valid types declared in RULE_TYPE_MAPPINGS. */
export const VALID_RULE_TYPES: RuleType[] = [
    ...new Set(RULE_TYPE_MAPPINGS.flatMap(mapping => mapping.ruleTypes))
];