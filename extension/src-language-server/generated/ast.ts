/******************************************************************************
 * This file was generated by langium-cli 0.3.0-next.5e9d27d.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/

/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { AstNode, AstReflection, Reference, isAstNode } from 'langium';

export interface ActionUCAs extends AstNode {
    readonly $container: Model;
    action: Reference<Command>
    system: Reference<Node>
    ucas: Array<UCA>
}

export const ActionUCAs = 'ActionUCAs';

export function isActionUCAs(item: unknown): item is ActionUCAs {
    return reflection.isInstance(item, ActionUCAs);
}

export interface Command extends AstNode {
    readonly $container: VE;
    label: string
    name: string
}

export const Command = 'Command';

export function isCommand(item: unknown): item is Command {
    return reflection.isInstance(item, Command);
}

export interface ContConstraint extends AstNode {
    readonly $container: Model;
    description: string
    name: string
    refs: Array<Reference<UCA>>
}

export const ContConstraint = 'ContConstraint';

export function isContConstraint(item: unknown): item is ContConstraint {
    return reflection.isInstance(item, ContConstraint);
}

export interface Graph extends AstNode {
    readonly $container: Model;
    name: string
    nodes: Array<Node>
}

export const Graph = 'Graph';

export function isGraph(item: unknown): item is Graph {
    return reflection.isInstance(item, Graph);
}

export interface Hazard extends AstNode {
    readonly $container: Model | Hazard;
    description: string
    header: string
    name: SubID
    refs: Array<Reference<Loss>>
    subComps: Array<Hazard>
}

export const Hazard = 'Hazard';

export function isHazard(item: unknown): item is Hazard {
    return reflection.isInstance(item, Hazard);
}

export interface HazardList extends AstNode {
    readonly $container: UCA | LossScenario;
    refs: Array<Reference<Hazard>>
}

export const HazardList = 'HazardList';

export function isHazardList(item: unknown): item is HazardList {
    return reflection.isInstance(item, HazardList);
}

export interface Loss extends AstNode {
    readonly $container: Model;
    description: string
    name: string
}

export const Loss = 'Loss';

export function isLoss(item: unknown): item is Loss {
    return reflection.isInstance(item, Loss);
}

export interface LossScenario extends AstNode {
    readonly $container: Model;
    description: string
    list: HazardList
    name: string
    uca: Reference<UCA>
}

export const LossScenario = 'LossScenario';

export function isLossScenario(item: unknown): item is LossScenario {
    return reflection.isInstance(item, LossScenario);
}

export interface Model extends AstNode {
    allUCAs: Array<ActionUCAs>
    controllerConstraints: Array<ContConstraint>
    controlStructure: Graph
    hazards: Array<Hazard>
    losses: Array<Loss>
    responsibilities: Array<Resps>
    safetyCons: Array<SafetyConstraint>
    scenarios: Array<LossScenario>
    systemLevelConstraints: Array<SystemConstraint>
}

export const Model = 'Model';

export function isModel(item: unknown): item is Model {
    return reflection.isInstance(item, Model);
}

export interface Node extends AstNode {
    readonly $container: Graph;
    actions: Array<VE>
    feedbacks: Array<VE>
    label: string
    level: number
    name: string
    variables: Array<Variable>
}

export const Node = 'Node';

export function isNode(item: unknown): item is Node {
    return reflection.isInstance(item, Node);
}

export interface Responsibility extends AstNode {
    readonly $container: Resps;
    description: string
    name: string
    refs: Array<Reference<SystemConstraint>>
}

export const Responsibility = 'Responsibility';

export function isResponsibility(item: unknown): item is Responsibility {
    return reflection.isInstance(item, Responsibility);
}

export interface Resps extends AstNode {
    readonly $container: Model;
    responsiblitiesForOneSystem: Array<Responsibility>
    system: Reference<Node>
}

export const Resps = 'Resps';

export function isResps(item: unknown): item is Resps {
    return reflection.isInstance(item, Resps);
}

export interface SafetyConstraint extends AstNode {
    readonly $container: Model;
    description: string
    name: string
    refs: Reference<LossScenario>
}

export const SafetyConstraint = 'SafetyConstraint';

export function isSafetyConstraint(item: unknown): item is SafetyConstraint {
    return reflection.isInstance(item, SafetyConstraint);
}

export interface SystemConstraint extends AstNode {
    readonly $container: Model | SystemConstraint;
    description: string
    header: string
    name: SubID
    refs: Array<Reference<Hazard>>
    subComps: Array<SystemConstraint>
}

export const SystemConstraint = 'SystemConstraint';

export function isSystemConstraint(item: unknown): item is SystemConstraint {
    return reflection.isInstance(item, SystemConstraint);
}

export interface UCA extends AstNode {
    readonly $container: ActionUCAs;
    description: string
    list: HazardList
    name: string
}

export const UCA = 'UCA';

export function isUCA(item: unknown): item is UCA {
    return reflection.isInstance(item, UCA);
}

export interface Variable extends AstNode {
    readonly $container: Node;
    name: string
    values: Array<string>
}

export const Variable = 'Variable';

export function isVariable(item: unknown): item is Variable {
    return reflection.isInstance(item, Variable);
}

export interface VE extends AstNode {
    readonly $container: Node;
    comms: Array<Command>
    target: Reference<Node>
}

export const VE = 'VE';

export function isVE(item: unknown): item is VE {
    return reflection.isInstance(item, VE);
}

export type SubID = string

export type StpaAstType = 'ActionUCAs' | 'Command' | 'ContConstraint' | 'Graph' | 'Hazard' | 'HazardList' | 'Loss' | 'LossScenario' | 'Model' | 'Node' | 'Responsibility' | 'Resps' | 'SafetyConstraint' | 'SystemConstraint' | 'UCA' | 'Variable' | 'VE';

export type StpaAstReference = 'ActionUCAs:action' | 'ActionUCAs:system' | 'ContConstraint:refs' | 'Hazard:refs' | 'HazardList:refs' | 'LossScenario:uca' | 'Responsibility:refs' | 'Resps:system' | 'SafetyConstraint:refs' | 'SystemConstraint:refs' | 'VE:target';

export class StpaAstReflection implements AstReflection {

    getAllTypes(): string[] {
        return ['ActionUCAs', 'Command', 'ContConstraint', 'Graph', 'Hazard', 'HazardList', 'Loss', 'LossScenario', 'Model', 'Node', 'Responsibility', 'Resps', 'SafetyConstraint', 'SystemConstraint', 'UCA', 'Variable', 'VE'];
    }

    isInstance(node: unknown, type: string): boolean {
        return isAstNode(node) && this.isSubtype(node.$type, type);
    }

    isSubtype(subtype: string, supertype: string): boolean {
        if (subtype === supertype) {
            return true;
        }
        switch (subtype) {
            default: {
                return false;
            }
        }
    }

    getReferenceType(referenceId: StpaAstReference): string {
        switch (referenceId) {
            case 'ActionUCAs:action': {
                return Command;
            }
            case 'ActionUCAs:system': {
                return Node;
            }
            case 'ContConstraint:refs': {
                return UCA;
            }
            case 'Hazard:refs': {
                return Loss;
            }
            case 'HazardList:refs': {
                return Hazard;
            }
            case 'LossScenario:uca': {
                return UCA;
            }
            case 'Responsibility:refs': {
                return SystemConstraint;
            }
            case 'Resps:system': {
                return Node;
            }
            case 'SafetyConstraint:refs': {
                return LossScenario;
            }
            case 'SystemConstraint:refs': {
                return Hazard;
            }
            case 'VE:target': {
                return Node;
            }
            default: {
                throw new Error(`${referenceId} is not a valid reference id.`);
            }
        }
    }
}

export const reflection = new StpaAstReflection();
