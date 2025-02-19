# PASTA: Pragmatic Automated System-Theoretic Process Analysis

This extension offers a Domain-Specific-Language (DSL) for System-Theoretic Process Analysis (STPA) including an automatic visualization and validity checks.

Examples can be found in [pasta-examples](https://github.com/kieler/pasta-examples).

## Features

### Validity Checks

Several validity checks are provided, for example
* for each control action at least one Unsafe Control Action (UCA) must be defined,
* for each UCA a constraint must be defined.
  
These checks can be turned off in the context menu of the editor.

### Diagram

A diagram can be opened for the analysis by clicking on the icon right above the editor or by selecting `Open in Diagram` in the editor context menu. In the diagram different color styles and filtering methods are provided. Clicking on a node fades out non-connected nodes and clicking on a node while pressing the `Ctrl` key fades out nodes that belong to another aspect.

### Diagram Snippets

Defining a control structure textually can be difficult at first. 
To better introduce new users to the syntax diagram snippets are provided in the `PASTA` tab on the left. 
A diagram snippet shows a control structure and by clicking on it the textual representation is added to the `ControlStructure` section in the currently open file. 
Custom snippets can be added by selecting the textual representation of the snippet that should be added and then selecting `Add STPA Diagram Snippet` in the context menu. 
Alternatively the textual representation can be entered in the diagram snippets tab and added by clicking on the button `Add Diagram Snippet`.

### Context Table

Instead of informal UCA definitions a context table may be used. This is done by using the section `Context-Table` instead of `UCAs`. A context table can then be generated automatically and shown alongside the diagram by selecting `Show Context Tables` in the editor context menu or the corresponding icon right above the editor. Clicking on a UCA in the context table highlights the corresponding node in the diagram and its definition in the editor. In the context table view a control action can be selected in order to inspect it. 

### Automation through Completion Item

Partly information is repeated in STPA e.g. when defining a scenario for a UCA, the UCA itself is written down again. 
To reduce the time effort, PASTA offers completion items, which generate text automatically based on the informations already stated in other components.
To access completion items, press `ctrl` + `space`.
The following completion items are provided:
* create system component
* create starting text for a plain text UCA
* create a template rule
* create a rule for a specific control action
* create rules for every combination of control action and type
* create controller constraints for all UCAs
* create starting text for a scenario for a UCA
* create basic scenarios for all UCAs

### Result Report

The context menu contains an option to automatically create a result report in form of a markdown file. 
The file contains a section for each aspect with its defined components and a diagram showing only the relevant components for the aspect to keep the diagram small. 
At the end all identified constraints are summarized and a diagram showing all components is embedded. 
The markdown file can easily be exported to a PDF file.

### Safe Behavioral Model Generation

In the context menu an option to automatically generate a safe behavioral model as an SCChart is provided. 
For that the defined UCAs are translated to LTL formulas, which are further used to create the SCChart.
This guarantees that the identified UCAs cannot occur since the LTL formulas are respected except the ones for the UCA type **too early**.
For the generation you can define ranges for the process model variable values with standard range notation and the keywords `MIN` and `MAX`.
Example process model:
```
processModel {
    currentSpeed: [desiredSpeed=[desiredSpeed], lessDesiredSpeed = [MIN, desiredSpeed), greaterDesiredSpeed=(desiredSpeed, MAX]]
}
```
In this case the controller has the process model variable `currentSpeed` which can take the values `desiredSpeed`, `lessDesiredSpeed`, and `greaterDesiredSpeed`.
For each of these values, the range it covers is defined.
`lessDesiredSpeed` covers every speed under the desired one, `greaterDesiredSpeed` every speed above the desired speed, and `desiredSpeed` only the desired speed.

The SCChart language and an automatic visualization is provided by the two KIELER extensions [KLighD Diagrams](https://marketplace.visualstudio.com/items?itemName=kieler.klighd-vscode) and [KIELER VS Code](https://marketplace.visualstudio.com/items?itemName=kieler.keith-vscode).

### Fault Tree Analysis (FTA)

Besides STPA the extension also supports FTA. A textual DSL as well as an automatic generation of a diagram is provided. The context menu provides an option to generate the (minimal) cut sets for the current Fault Tree. These cut sets can also be visualized by selecting the desired cut set in the diagram options. In order to analyse the cut sets of a subtree, a rightclick on the node which should be the root of the subtree is needed and than the action to generate the (minimal) cut sets can be selected.

Furthermore, after an STPA is done, a corresponding Fault Tree can be generated automatically. To do this, the action "Generate Fault Trees" in the context menu must be selected. It generates a fault tree for each hazard and groups the scenarios by their causal factor if one is given.

## DSL

### STPA

To use the extension for an analysis, the file in which the analysis is done must have `.stpa` as its file ending. 
Each STPA aspect has its own section in the DSL. Components for each aspect are defined with an ID, a description, and a reference list. 
In order to define a new component, the prefix of the corresponding aspect must be stated, for example "L", and afterwards a string with the description. 
The numbering of the IDs is adjusted automatically. 
For Hazards and system-level constraints subcomponents can be defined.
For scenarios the causal factor can stated.

In the control structure, system components can be stated, which can contain a process model, input, output, control actions, feedback, and further system components. The visualization of input and output edges is in an experimental state at the moment and will be improved in the future.

*Minimal example of an analysis for a ferry:*
```
Losses
L1 "Loss of life or serious injury to people"

Hazards
H1 "Vessel's exposure to major damage or breakdown" [L1] {
    H1.1 "Vessel enters No-Go area"
}

SystemConstraints
SC1 "Vessel must not be exposed to major damage or breakdown" [H1] {
    SC1.1 "Vessel must not enter a No Go Area" [H1.1]
}

ControlStructure
Ferry {
    ControlCentre {
        hierarchyLevel 0
        processModel {
            mode: [docking, driving]
        }
        input [weather "weather", other "Other information"]
        output [info "information"]
        controlActions {
            [navi "Route navigation", data "Weather data"] -> VirtualCaptain 
            [manual "Manual setting"] -> Engine
        }
    }
    VirtualCaptain {
        hierarchyLevel 1
        controlActions {
            [pars "Set parameters"] -> Engine
        }
        feedback {
            [status "System status", faults "Faults"] -> ControlCentre 
        }
    }
    Engine {
        hierarchyLevel 2
        feedback {
            [motion "Motion"] -> VirtualCaptain
        }
    }
}

Responsibilities
VirtualCaptain {
    R1 "Actuate reverse gear when too close to a No Go Area" [SC1]
}
ControlCentre {
    R3 "Manually set parameters of engine in case of a malfunction" [SC1]
}

UCAs
ControlCentre.manual {
    notProviding {
        UCA1 "ControlCentre does not provide Manual setting when VC is malfunctioning and vessel too close to a No Go Area" [H1]
    }
    providing {}
    tooEarly/Late {}
    stoppedTooSoon {}
}

ControllerConstraints
C1 "ControlCentre must provide the Manual setting control action during VC malfunctioning and vessel too close to No Go Area" [UCA1]

LossScenarios
Scenario1 <componentFailure> for UCA1 "Abnormal vessel behavior occurs. Vessel comes too close to a No Go Area and ControlCentre does not manual set the parameters of the engine, causing the entering of a No Go Area." [H1]
Scenario2 "Virtual Captain sends the Set parameters command upon coming too close to a No Go Area, but decceleration is not applied due to actuator failure." [H1]

SafetyRequirements
SR1 "ControlCentre must manual set the parameters of the engine when vessel comes too close to a No Go Area" [Scenario1]
```

*Example for defining UCAs with the context table:*
```
Context-Table
RL1 {
    controlAction: ControlCentre.manual
    type: not-provided
    contexts: {
        UCA1 [mode = docking] [H1]
    }
}
```

### FTA

The file in which the analysis is done must have `.fta` as its file ending. Each component type in the fault tree has its own section. Components are stated with an ID and a descriptions. Afterwards, Conditions for Inhibit gates can be stated. The actual fault tree is than stated with a top event and the gates leading to this event. The gates can be annotated with a description as well. The gate types Or, And, Inhibit, and n/k are supported.

*Example of an analysis:*

```
Components
M1 "Redundant memory unit 1"
M2 "Redundant memory unit 2"
M3 "Redundant memory unit 3"
C1 "CPU1"
C2 "CPU2"
PS "Power supply"
B "System bus"

Conditions
U "In Use"

TopEvent
"System Failure" = G1 

Gates
G1 = U inhibits G2 
G2 = G3 or B 
G3 = G4 and G5
G4 = C1 or PS or G6
G5 = C2 or PS or G6
G6 "Memory Fail" = 2 of M1, M2, M3
```

## Diagram Options

The extension provides several diagram options to adjust the diagram.
* Model Order: Order of the elements depends on the order of their textual definition
* Node Label Management: Node Labels can be wrapped, truncated, or not shown at all. The Shortening Width states how many characters are allowed in one line when truncating/wrapping

### STPA
* Color Style: The STPA aspect are colored differently to better distinguish them. With this option this can be adjusted to just use black or fewer/more colors. 
* Hierarchy: If this option is selected, subcomponents are drawn inside their parents. Otherwise this connection is shown by an edge from the subcomponent to its parent.
* Group UCAs: UCAs can be grouped by their control action or their system component. Each group of UCAs has their own layer in the diagram.
* Show Labels of: This option determines of which aspects the descriptions are shown in the diagram. If "Automatic" is selected, the shown labels are determined by the cursor position. In most cases the labels of the aspect which must be referenced by the currently modified aspect are shown. When writing Hazards also the Hazard descriptions are shown.
* Filter UCA by Control Action: The UCAs can be filtered such that only UCAs for a certain control action are shown making the diagram smaller and clearer.
* Show x: When selected the specified graph/aspect is shown, otherwise it is hidden.


### FTA 
* Show Gate Descriptions: Shows the descriptions of the gates in the diagram.
* Show Component Descriptions: Shows the descriptions of the components in the diagram.
* Highlight Cut Set: To use this first the action to generate the cut sets must be executed. Then here a cut set can be selected. The components belonging to the cut set are highlighted in red, components and gates irrelevant for the failure are faded out, and the top event is highlighted in blue. Thus, when only a subtree is analyzed, the root of this subtree is highlighted. Additionally, the option SPoFs in the dropdown menu highlights all single point of failures.
