/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021 by
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

grammar Stpa

entry Model:
    ('Goals' goals+=Goal*)?
    ('Assumptions' assumptions+=Assumption*)?
    ('Losses' losses+=Loss*)?
    ('Hazards' hazards+=Hazard*)?
    ('SystemConstraints' systemLevelConstraints+=SystemConstraint*)?
    ('ControlStructure' controlStructure=Graph)?
    ('Responsibilities' responsibilities+=SystemResponsibilities*)?
    (('UCAs' allUCAs+=ActionUCAs*) | ('Context-Table' rules+=Rule*))?
    ('DCAs' allDCAs+=DCARule*)?
    ('ControllerConstraints' controllerConstraints+=ControllerConstraint*)?
    ('LossScenarios' scenarios+=LossScenario*)?
    ('SafetyRequirements' safetyCons+=SafetyConstraint*)?;

Goal:
    name=ID description=STRING;

Assumption:
    name=ID description=STRING;

Rule:
    name=ID '{'
        'controlAction:' system=[Node] '.' action=[Command]
        'type:' type=(NotProvided | Provided | 'too-late' | 'too-early' | 'wrong-time' | 'applied-too-long' | 'stopped-too-soon')
        'contexts:' '{'
            contexts+=Context*
        '}'
    '}';

Context:
    name=ID '['assignedValues+=AssignedValue (',' assignedValues+=AssignedValue)*']' 
    list=HazardList;

Loss:
    name=ID description=STRING;

Hazard:
    name=SubID description=STRING 
    ('['refs+=[Loss] (',' refs+=[Loss])*']')?
    ('{' (header=STRING? subComponents+=Hazard+)*'}')?;

SystemConstraint:
    name=SubID description=STRING 
    '[' 
    refs+=[Hazard:SubID] (',' refs+=[Hazard:SubID])*
    ']'
    ('{' (header=STRING? subComponents+=SystemConstraint+)*'}')?;

Graph:
    name=ID '{'(nodes+=Node /* | edges+=Edge */)*'}';

Node:
    name=ID '{'
        ('hierarchyLevel' level = INT)?
        ('label' label=STRING)?
        ('processModel' '{'variables+=Variable*'}')?
        ('input' '[' inputs+=Command (',' inputs+=Command)* ']')?
        ('output' '[' outputs+=Command (',' outputs+=Command)* ']')?
        ('controlActions' '{'actions+=VerticalEdge*'}')?
        ('feedback' '{'feedbacks+=VerticalEdge*'}')?
        (children+=Node)*
    '}';

/* Edge:
    name=ID '{'
        source=[Node] '->' target=[Node]
        ('label' label=STRING)?
    '}'; */

Variable:
    name=ID':' '['values+=VariableValue (',' values+=VariableValue)*']';

VariableValue:
    name=QualifiedName (operator=('!='|'=') firstParenthesis=('['|'(') 
        firstValue=(QualifiedName | INT | 'MIN' | 'true' | 'false') (',' secondValue=(QualifiedName | INT | 'MAX'))? 
    secondParenthesis=(']'|')'))?;

VerticalEdge:
    '[' comms+=Command (',' comms+=Command)* ']' '->' target=[Node];

Command:
    name=ID label=STRING;

SystemResponsibilities:
    system=[Node] '{'responsiblitiesForOneSystem+=Responsibility*'}';

Responsibility:
    name=ID description=STRING '[' 
    refs+=[SystemConstraint:SubID] (',' refs+=[SystemConstraint:SubID])*
    ']';

ActionUCAs:
    system=[Node]'.'
    action=[Command] '{'
        'notProviding' '{'notProvidingUcas+=UCA*'}'
        'providing' '{'providingUcas+=UCA*'}'
        'tooEarly/Late' '{'wrongTimingUcas+=UCA*'}'
        'stoppedTooSoon' '{'continousUcas+=UCA*'}'
    '}';

UCA:
    name=ID description=STRING list=HazardList;

DCARule:
    name=ID '{'
        'controlAction:' system=[Node] '.' action=[Command]
        'type:' type=(NotProvided | Provided)
        'contexts:' '{'
            contexts+=DCAContext*
        '}'
    '}';

DCAContext:
    name=ID '[' assignedValues+=AssignedValue (',' assignedValues+=AssignedValue)*']';

AssignedValue:
    variable=[Variable] '=' value=[VariableValue:QualifiedName];

ControllerConstraint:
    name=ID description=STRING '['(refs+=[UCA] | refs+=[Context]) (',' (refs+=[UCA] | refs+=[Context]))*']';

LossScenario:
    (name=ID ('<' factor=CausalFactor '>')? description=STRING list=HazardList) |
    (name=ID ('<' factor=CausalFactor '>')? 'for' (uca=[UCA] | uca=[Context]) description=STRING (list=HazardList)?);

CausalFactor returns string:
    'controlAction' | 'inadequateOperation' | 'delayedOperation' | 'componentFailure' | 'changesOverTime' |
    'conflictingCA' | 'wrongProcessInput' | 'disturbance' | 'processOutput' | 'delayedFeedback' | 
    'measurementInaccurate' | 'incorrectInformationProvided' | 'missingFeedback' | 'inadequateControlAlgorithm' |
    'wrongProcessModel' | 'wrongControlInput';

HazardList:
    '[' refs+=[Hazard:SubID] (',' refs+=[Hazard:SubID])*']';

SafetyConstraint:
    name=ID description=STRING '['refs+=[LossScenario] (',' refs+=[LossScenario])*']';

NotProvided returns string:
    'not-provided';

Provided returns string:
    'provided';

SubID returns string:
    ID('.'INT)*;

QualifiedName returns string:
    ID('-'ID)*;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;