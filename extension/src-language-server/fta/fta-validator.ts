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

import { ValidationAcceptor, ValidationChecks, ValidationRegistry } from "langium";
import { ModelFTA, PastaAstType } from "../generated/ast.js";
import type { FtaServices } from "./fta-module.js";

/**
 * Registry for FTA validation checks.
 */
export class FtaValidationRegistry extends ValidationRegistry {
    constructor(services: FtaServices) {
        super(services);
        const validator = services.validation.FtaValidator;
        const checks: ValidationChecks<PastaAstType> = {
            ModelFTA: validator.checkModel,
        };
        this.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class FtaValidator {
    /**
     * Executes validation checks for the whole model.
     * @param model The model to validate.
     * @param accept
     */
    checkModel(model: ModelFTA, accept: ValidationAcceptor): void {
        this.checkIDsAreUnique(model, accept);
    }

    /**
     * Controls whether the ids of the elements in {@code model} are unique.
     * @param model The model to validate.
     * @param accept
     */
    checkIDsAreUnique(model: ModelFTA, accept: ValidationAcceptor): void {
        const componentNames = new Set();
        const namedElements = [...model.components, ...model.conditions, ...model.gates];
        for (const element of namedElements) {
            if (componentNames.has(element.name)) {
                accept("error", `All identifiers must be unique.`, { node: element, property: "name" });
            }
            componentNames.add(element.name);
        }
    }
}
