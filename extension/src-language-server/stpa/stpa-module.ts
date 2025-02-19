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

const ElkConstructor = require('elkjs/lib/elk.bundled.js').default;
import { Module } from "langium";
import { LangiumSprottyServices, SprottyDiagramServices } from "langium-sprotty";
import { PartialLangiumServices } from "langium/lsp";
import { DefaultElementFilter, ElkFactory, IElementFilter, ILayoutConfigurator } from "sprotty-elk/lib/elk-layout.js";
import { LayoutEngine } from '../layout-engine.js';
import { StpaDiagramSnippets } from "../snippets/stpa-snippets.js";
import { ContextTableProvider } from "./contextTable/context-dataProvider.js";
import { StpaDiagramGenerator } from "./diagram/diagram-generator.js";
import { StpaLayoutConfigurator } from "./diagram/layout-config.js";
import { StpaSynthesisOptions } from "./diagram/stpa-synthesis-options.js";
import { IDEnforcer } from "./services/ID-enforcer.js";
import { STPACompletionProvider } from './services/stpa-completion-provider.js';
import { STPAFoldingRangeProvider } from './services/stpa-fold-provider.js';
import { StpaScopeProvider } from './services/stpa-scopeProvider.js';
import { StpaValidator } from "./services/stpa-validator.js";

/**
 * Declaration of custom services - add your own service classes here.
 */
export type StpaAddedServices = {
    lsp: {
        StpaCompletionProvider: STPACompletionProvider;
        StpaFoldingRangeProvider: STPAFoldingRangeProvider;
    };
    references: {
        StpaScopeProvider: StpaScopeProvider;
    };
    validation: {
        StpaValidator: StpaValidator;
    };
    layout: {
        ElkFactory: ElkFactory;
        ElementFilter: IElementFilter;
        LayoutConfigurator: ILayoutConfigurator;
    };
    options: {
        SynthesisOptions: StpaSynthesisOptions;
    };
    contextTable: {
        ContextTableProvider: ContextTableProvider;
    };
    utility: {
        IDEnforcer: IDEnforcer;
    };
    snippets: {
        StpaDiagramSnippets: StpaDiagramSnippets;
    };
};

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type StpaServices = LangiumSprottyServices & StpaAddedServices;

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const STPAModule: Module<StpaServices, PartialLangiumServices & SprottyDiagramServices & StpaAddedServices> = {
    diagram: {
        DiagramGenerator: services => new StpaDiagramGenerator(services),
        ModelLayoutEngine: services =>
            new LayoutEngine(
                services.layout.ElkFactory,
                services.layout.ElementFilter,
                services.layout.LayoutConfigurator
            ) as any,
    },
    lsp: {
        CompletionProvider: services => new STPACompletionProvider(services),
        StpaCompletionProvider: services => new STPACompletionProvider(services),
        FoldingRangeProvider: services => new STPAFoldingRangeProvider(services),
        StpaFoldingRangeProvider: services => new STPAFoldingRangeProvider(services),
    },
    references: {
        ScopeProvider: services => new StpaScopeProvider(services),
        StpaScopeProvider: services => new StpaScopeProvider(services),
    },
    validation: {
        StpaValidator: () => new StpaValidator(),
    },
    layout: {
        ElkFactory: () => () => new ElkConstructor({ algorithms: ["layered", "rectpacking"] }),
        ElementFilter: () => new DefaultElementFilter(),
        LayoutConfigurator: () => new StpaLayoutConfigurator(),
    },
    options: {
        SynthesisOptions: () => new StpaSynthesisOptions(),
    },
    contextTable: {
        ContextTableProvider: services => new ContextTableProvider(services),
    },
    utility: {
        IDEnforcer: services => new IDEnforcer(services),
    },
    snippets: {
        StpaDiagramSnippets: services => new StpaDiagramSnippets(services),
    },
};
