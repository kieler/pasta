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

import { ElkExtendedEdge, ElkPrimitiveEdge } from "elkjs";
import { ElkLayoutEngine } from "sprotty-elk/lib/elk-layout.js";
import { Point, SEdge, SGraph, SModelIndex } from "sprotty-protocol";
import { FTAEdge } from "./fta/diagram/fta-interfaces.js";
import { FTA_EDGE_TYPE } from "./fta/diagram/fta-model.js";
import { STPA_EDGE_TYPE, STPA_INTERMEDIATE_EDGE_TYPE } from './stpa/diagram/stpa-model.js';

export class LayoutEngine extends ElkLayoutEngine {
    layout(sgraph: SGraph, index?: SModelIndex): SGraph | Promise<SGraph> {
        if (this.getBasicType(sgraph) !== "graph") {
            return sgraph;
        }
        if (!index) {
            index = new SModelIndex();
            index.add(sgraph);
        }

        // STEP 1: Transform the Sprotty graph into an ELK graph with optional pre-processing
        const elkGraph = this.transformGraph(sgraph, index);
        /* used to inspect the elk graph in elklive */
        // const debugElkGraph = JSON.stringify(elkGraph);
        // console.log(debugElkGraph);

        if (this.preprocessor) {
            this.preprocessor.preprocess(elkGraph, sgraph, index);
        }

        // STEP 2: Invoke the ELK layout engine
        return this.elk.layout(elkGraph).then(result => {
            // STEP 3: Apply the results with optional post-processing to the original graph
            if (this.postprocessor) {
                this.postprocessor.postprocess(result, sgraph, index!);
            }
            this.applyLayout(result, index!);
            return sgraph;
        });
    }

    /** Override method to save junctionpoints*/
    protected applyEdge(sedge: SEdge, elkEdge: ElkExtendedEdge, index: SModelIndex): void {
        const points: Point[] = [];
        if (sedge.type === FTA_EDGE_TYPE || sedge.type === STPA_EDGE_TYPE || sedge.type === STPA_INTERMEDIATE_EDGE_TYPE) {
            (sedge as any as FTAEdge).junctionPoints = elkEdge.junctionPoints;
        }
        if (elkEdge.sections && elkEdge.sections.length > 0) {
            const section = elkEdge.sections[0];
            if (section.startPoint) {
                points.push(section.startPoint);
            }
            if (section.bendPoints) {
                points.push(...section.bendPoints);
            }
            if (section.endPoint) {
                points.push(section.endPoint);
            }
        } else if (isPrimitiveEdge(elkEdge)) {
            if (elkEdge.sourcePoint) {
                points.push(elkEdge.sourcePoint);
            }
            if (elkEdge.bendPoints) {
                points.push(...elkEdge.bendPoints);
            }
            if (elkEdge.targetPoint) {
                points.push(elkEdge.targetPoint);
            }
        }
        sedge.routingPoints = points;

        if (elkEdge.labels) {
            elkEdge.labels.forEach(elkLabel => {
                const sLabel = elkLabel.id && index.getById(elkLabel.id);
                if (sLabel) {
                    this.applyShape(sLabel, elkLabel, index);
                }
            });
        }
    }
}

function isPrimitiveEdge(edge: unknown): edge is ElkPrimitiveEdge {
    return (
        typeof (edge as ElkPrimitiveEdge).source === "string" && typeof (edge as ElkPrimitiveEdge).target === "string"
    );
}
