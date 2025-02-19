/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2023 by
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

/** @jsx svg */
import { VNode } from 'snabbdom';
import { SNodeImpl, svg } from 'sprotty';

/**
 * Creates a circle for {@code node}.
 * @param node The node that should be represented by a circle.
 * @returns A circle for {@code node}.
 */
export function renderOval(node: SNodeImpl): VNode {
    const nodeWidth = node.size.width < node.size.height ? node.size.height : node.size.width;
    return <ellipse cx={Math.max(node.size.width, 0) / 2.0}
        cy={Math.max(node.size.height, 0) / 2.0}
        rx={Math.max(nodeWidth, 0) / 2.0}
        ry={Math.max(node.size.height, 0) / 2.0} />;
}

/**
 * Creates an ellipse for {@code node}.
 * @param x The x-coordinate of the ellipse.
 * @param y The y-coordinate of the ellipse.
 * @param width The width of the ellipse.
 * @param height The height of the ellipse.
 * @param lineWidth The line width of the ellipse.
 * @returns an ellipse for {@code node}.
 */
export function renderEllipse(x: number | undefined, y: number | undefined, width: number, height: number, lineWidth: number): VNode {
    return <ellipse
        {...(x && y ? { transform: `translate(${x},${y})` } : {})}
        cx={0}
        cy={0}
        rx={width / 2 - lineWidth / 2}
        ry={height / 2 - lineWidth / 2}
    />;
}

/**
 * Creates a rectangle for {@code node}.
 * @param node The node that should be represented by a rectangle.
 * @returns A rectangle for {@code node}.
 */
export function renderRectangleForNode(node: SNodeImpl): VNode {
    return <rect
        x="0" y="0"
        width={Math.max(node.size.width, 0)} height={Math.max(node.size.height, 0)}
    />;
}

/**
 * Creates a rectangle for with the given parameters.
 * @param x The x-coordinate of the rectangle.
 * @param y The y-coordinate of the rectangle.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @returns A rectangle with the given parameters.
 */
export function renderRectangle(x: number, y: number, width: number, height: number): VNode {
    return <rect
        x={x} y={y}
        width={Math.max(width, 0)} height={Math.max(height, 0)}
    />;
}

export function renderPort(x:number, y: number, width: number, height: number): VNode {
    return <rect
        x={x} y={y}
        width={Math.max(width, 0)} height={Math.max(height, 0)}
    />;
}

/**
 * Creates rectangle borders for {@code node} at the top and bottom.
 * @param node The node that should be represented by a rectangle.
 * @returns rectangle borders for {@code node} at the top and bottom.
 */
export function renderHorizontalLine(node: SNodeImpl): VNode {
    return <g>
        <line x="0" y="0" x2={Math.max(node.size.width, 0)} y2="0" />
    </g>;
}

/**
 * Creates a vertical line going through {@code node} in the middle.
 * @param node The node for which the line should be created.
 * @returns a vertical line for {@code node} going through its mid.
 */
export function renderVerticalLine(node: SNodeImpl): VNode {
    return <g>
        <line x="0" y="0" x2="0" y2={Math.max(node.size.height, 0)} />
    </g>;
}

/**
 * Creates a rounded rectangle for {@code node}.
 * @param node The node that should be represented by a rounded rectangle.
 * @param rx The x-radius of the rounded corners.
 * @param ry The y-radius of the rounded corners.
 * @returns A rounded rectangle for {@code node}.
 */
export function renderRoundedRectangle(node: SNodeImpl, rx = 5, ry = 5): VNode {
    return <rect
        x="0" y="0"
        rx={rx} ry={ry}
        width={Math.max(node.size.width, 0)} height={Math.max(node.size.height, 0)}
    />;
}


/**
 * Creates a triangle for {@code node}.
 * @param node The node that should be represented by a triangle.
 * @returns A triangle for {@code node}.
 */
export function renderTriangle(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX = Math.max(node.size.width, 0) / 2.0;
    const rightX = Math.max(node.size.width, 0);
    const botY = Math.max(node.size.height, 0);
    const topY = 0;
    const path = 'M' + leftX + " " + botY + " L " + midX + " " + topY + " L " + rightX + " " + botY + 'Z';
    return <path
        d={path}
    />;
}

/**
 * Creates a mirrored triangle for {@code node}.
 * @param node The node that should be represented by a mirrored triangle.
 * @returns A mrrored triangle for {@code node}.
 */
export function renderMirroredTriangle(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX = Math.max(node.size.width, 0) / 2.0;
    const rightX = Math.max(node.size.width, 0);
    const botY = Math.max(node.size.height, 0);
    const topY = 0;
    const path = 'M' + leftX + " " + topY + " L " + midX + " " + botY + " L " + rightX + " " + topY + 'Z';
    return <path
        d={path}
    />;
}

/**
 * Creates a trapez for {@code node}.
 * @param node The node that should be represented by a trapez.
 * @returns A trapez for {@code node}.
 */
export function renderTrapez(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX1 = Math.max(node.size.width, 0) / 4.0;
    const midX2 = Math.max(node.size.width, 0) * (3.0 / 4.0);
    const rightX = Math.max(node.size.width, 0);
    const botY = Math.max(node.size.height, 0);
    const topY = 0;
    const path = 'M' + leftX + " " + botY + " L " + midX1 + " " + topY + " L " + midX2 + " " + topY
        + " L " + rightX + " " + botY + 'Z';
    return <path
        d={path}
    />;
}

/**
 * Creates a diamond for {@code node}.
 * @param node The node that should be represented by a diamond.
 * @returns A diamond for {@code node}.
 */
export function renderDiamond(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX = Math.max(node.size.width, 0) / 2.0;
    const rightX = Math.max(node.size.width, 0);
    const topY = 0;
    const midY = Math.max(node.size.height, 0) / 2.0;
    const botY = Math.max(node.size.height, 0);
    const path = 'M' + leftX + " " + midY + " L " + midX + " " + topY + " L " + rightX + " " + midY
        + " L " + midX + " " + botY + 'Z';
    return <path
        d={path}
    />;
}

/**
 * Creates a pentagon for {@code node}.
 * @param node The node that should be represented by a pentagon.
 * @returns A pentagon for {@code node}.
 */
export function renderPentagon(node: SNodeImpl): VNode {
    const startX = 5;
    const leftX = 0;
    const midX = Math.max(node.size.width, 0) / 2.0;
    const rightX = Math.max(node.size.width, 0);
    const endX = Math.max(node.size.width, 0) - 5;
    const topY = 0;
    const midY = Math.max(node.size.height, 0) / 3.0;
    const botY = Math.max(node.size.height, 0);
    const path = 'M' + startX + " " + botY + " L " + leftX + " " + midY + " L " + midX + " " + topY
        + " L " + rightX + " " + midY + " L " + endX + " " + botY + 'Z';
    return <path
        d={path}
    />;
}

/**
 * Creates a hexagon for {@code node}.
 * @param node The node that should be represented by a hexagon.
 * @returns A hexagon for {@code node}.
 */
export function renderHexagon(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX1 = 5;
    const midX2 = Math.max(node.size.width, 0) - 5;
    const rightX = Math.max(node.size.width, 0);
    const topY = 0;
    const midY = Math.max(node.size.height, 0) / 2.0;
    const botY = Math.max(node.size.height, 0);
    const path = 'M' + leftX + " " + midY + " L " + midX1 + " " + botY + " L " + midX2 + " " + botY
        + " L " + rightX + " " + midY + " L " + midX2 + " " + topY + " L " + midX1 + " " + topY + 'Z';
    return <path
        d={path}
    />;
}

/**
 * Creates an And-Gate for {@code node}.
 * @param node The node that should be represented by an And-Gate.
 * @returns An And-Gate for {@code node}.
 */
export function renderAndGate(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX = Math.max(node.size.width, 0) / 2.0;
    const rightX = Math.max(node.size.width, 0);
    const botY = Math.max(node.size.height, 0);
    const midY = Math.max(node.size.height, 0) / 2.0;
    const topY = 0;

    const path = `M ${leftX}, ${midY} V ${botY} H ${rightX} V ${midY} C ${rightX}, ${midY} ${rightX}, ${topY} ${midX}, ${topY} ${leftX}, ${topY} ${leftX}, ${midY} ${leftX}, ${midY} Z`;

    return <path
        d={path}
    />;
}

/**
 * Creates an Or-Gate for {@code node}.
 * @param node The node that should be represented by an Or-Gate.
 * @returns An Or-Gate for {@code node}.
 */
export function renderOrGate(node: SNodeImpl): VNode {
    const path = createOrGate(node);
    return <path
        d={path}
    />;
}

/**
 * Creates an Kn-Gate for {@code node}.
 * @param node The node that should be represented by an Kn-Gate.
 * @returns An Kn-Gate for {@code node}.
 */
export function renderKnGate(node: SNodeImpl, k: number, n: number): VNode {
    const rightX = Math.max(node.size.width, 0);
    const midX = rightX / 2.0;
    const botY = Math.max(node.size.height, 0);
    const path = createOrGate(node);
    return (
        <g>
            <path d={path} />
            <text x={midX - 7.0} y={botY - 4.5} text-anchor="middle" class-fta-text={true}>
                {`${k}/${n}`}
            </text>
        </g>
    );
}

/**
 * Creates an Or-Gate for {@code node}.
 * @param node The node that should be represented by an Or-Gate.
 * @returns an Or-Gate for {@code node}.
 */
function createOrGate(node: SNodeImpl): string {
    const leftX = 0;
    const rightX = Math.max(node.size.width, 0);
    const midX = rightX / 2.0;
    const botY = Math.max(node.size.height, 0);
    const nearBotY = botY - (Math.max(node.size.height, 0) / 10.0);
    const midY = Math.max(node.size.height, 0) / 2;
    const topY = 0;
    const path = `M${leftX},${midY} V ${botY}` + `C ${leftX}, ${botY} ${leftX + 10}, ${nearBotY} ${midX}, ${nearBotY} ${rightX - 10}, ${nearBotY} ${rightX}, ${botY} ${rightX}, ${botY}`
        + `V ${midY} A ${node.size.width},${node.size.height - 10},${0},${0},${0},${midX},${topY} A ${node.size.width},${node.size.height - 10},${0},${0},${0},${leftX},${midY} Z`;

    return path;
}

/**
 * Creates an Inhibit-Gate for {@code node}.
 * @param node The node that should be represented by an Inhibit-Gate.
 * @returns An Inhibit-Gate for {@code node}.
 */
export function renderInhibitGate(node: SNodeImpl): VNode {
    const leftX = 0;
    const midX = Math.max(node.size.width, 0) / 2.0;
    const rightX = Math.max(node.size.width, 0);
    const lowestY = Math.max(node.size.height, 0);
    const lowY = Math.max(node.size.height, 0) - (Math.max(node.size.height, 0) / 4.0);
    const highY = Math.max(node.size.height, 0) / 4.0;
    const highestY = 0;

    const path = `M${leftX},${lowY} L ${leftX} ${highY} L ${midX} ${highestY} L ${rightX} ${highY} L ${rightX} ${lowY} L ${midX} ${lowestY} Z`;

    return <path
        d={path}
    />;
}

/**
 * Creates the icon for collapsing a node.
 * @returns 
 */
export function renderCollapseIcon(): VNode {
    return <g>
        {renderCollapseExpandTriangle()}
        {renderCollapseSign()}
    </g>;
}

/**
 * Creates the triangle for the expand and collapse icon.
 * @returns 
 */
export function renderCollapseExpandTriangle(): VNode {
    const path = `M 0 0 L 0 15 L 15 0 Z`;
    return <path class-collapse-expand-triangle={true}
        d={path}
    />;
}

/**
 * Creates the minus-sign for the collapse icon.
 * @returns 
 */
export function renderCollapseSign(): VNode {
    const path = `M 3 5 L 7 5`;
    return <path class-collapse-expand-sign={true}
        d={path}
    />;
}

/**
 * Creates the icon for expanding a node.
 * @returns 
 */
export function renderExpandIcon(): VNode {
    return <g>
        {renderCollapseExpandTriangle()}
        {renderExpandSign()}
    </g>;
}

/**
 * Creates the plus-sign for the expand icon.
 * @returns 
 */
export function renderExpandSign(): VNode {
    const path = `M 3 5 L 7 5 M 5 3 L 5 7`;
    return <path class-collapse-expand-sign={true}
        d={path}
    />;
}