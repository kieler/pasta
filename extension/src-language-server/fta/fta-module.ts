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

const ElkConstructor = require('elkjs/lib/elk.bundled.js').default;
import { Module } from "langium";
import { LangiumSprottyServices, SprottyDiagramServices } from "langium-sprotty";
import { PartialLangiumServices } from 'langium/lsp';
import { DefaultElementFilter, ElkFactory, IElementFilter, ILayoutConfigurator } from "sprotty-elk/lib/elk-layout.js";
import { LayoutEngine } from "../layout-engine.js";
import { FtaDiagramGenerator } from "./diagram/fta-diagram-generator.js";
import { FtaLayoutConfigurator } from "./diagram/fta-layout-config.js";
import { FtaSynthesisOptions } from "./diagram/fta-synthesis-options.js";
import { FtaScopeProvider } from "./fta-scopeProvider.js";
import { FtaValidationRegistry, FtaValidator } from "./fta-validator.js";

/**
 * Declaration of custom services.
 */
export type FtaAddedServices = {
    references: {
        FtaScopeProvider: FtaScopeProvider;
    };
    validation: {
        FtaValidator: FtaValidator;
    };
    layout: {
        ElkFactory: ElkFactory;
        ElementFilter: IElementFilter;
        LayoutConfigurator: ILayoutConfigurator;
    };
    options: {
        SynthesisOptions: FtaSynthesisOptions;
    };
};

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type FtaServices = LangiumSprottyServices & FtaAddedServices;

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const FtaModule: Module<FtaServices, PartialLangiumServices & SprottyDiagramServices & FtaAddedServices> = {
    diagram: {
        DiagramGenerator: services => new FtaDiagramGenerator(services),
        ModelLayoutEngine: services =>
            new LayoutEngine(
                services.layout.ElkFactory,
                services.layout.ElementFilter,
                services.layout.LayoutConfigurator
            ) as any,
    },
    references: {
        ScopeProvider: services => new FtaScopeProvider(services),
        FtaScopeProvider: services => new FtaScopeProvider(services),
    },
    validation: {
        ValidationRegistry: services => new FtaValidationRegistry(services),
        FtaValidator: () => new FtaValidator(),
    },
    layout: {
        ElkFactory: () => () => new ElkConstructor({ algorithms: ["layered"] }),
        ElementFilter: () => new DefaultElementFilter(),
        LayoutConfigurator: () => new FtaLayoutConfigurator(),
    },
    options: {
        SynthesisOptions: () => new FtaSynthesisOptions(),
    },
};
