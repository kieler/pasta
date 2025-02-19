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
/** @jsx html */

import { icons } from "feather-icons";
import { VNode } from "snabbdom";
import { html } from "sprotty"; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Add the feather icon with the given icon ID to a snabbdom VNode as used in sprotty.
 * 
 * @param paramProps properties containing the ID of the feather icon.
 * @returns The SVG VNode resulting from this feather icon ID.
 */
export function FeatherIcon(props: { iconId: string }): VNode {
  // Imitates what feather would usually do, all attributes are put in the styles (if possible) and
  // the classes are written in as well. Missing are the xmlns and viewBox, but they do not seem to
  // be necessary anyways.
  const classes: Record<string, boolean> = {"feather": true};
  classes[`feather-${props.iconId}`] = true;

  return <svg 
    style={{
      width: '24',
      height: '24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }}
    class={classes}
    props={{innerHTML: icons[props.iconId].toString()}}
  />;
}
