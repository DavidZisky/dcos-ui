/* eslint-disable no-unused-vars */
import React from "react";
/* eslint-enable no-unused-vars */

import Node from "#SRC/js/structs/Node";
import Util from "#SRC/js/utils/Util";
import CompositeState from "#SRC/js/structs/CompositeState";

const TaskUtil = {
  /**
   * Returns a list of ips or hosts from task
   * @param  {object} task to return ip or host list from
   * @param  {object} node to get host name from, if necessary
   * @return {Array.<string>} an array of ip addresses or hosts
   */
  getHostAndPortList(task = {}, node = new Node()) {
    const networkType = this.getNetworkType(task);
    const ports = this.getPorts(task);
    const hostName = node.getHostName();

    // networkType is 'HOST', but no host name
    if (networkType !== "BRIDGE" && networkType !== "USER" && !hostName) {
      return { ports: [], hosts: [] };
    }

    // networkType is 'HOST'
    if (networkType !== "BRIDGE" && networkType !== "USER") {
      return { ports, hosts: [hostName] };
    }

    // networkType is 'BRIDGE' or 'USER'
    const portMappings = this.getPortMappings(task) || [];
    if (portMappings.length) {
      return {
        ports: portMappings.map(function(mapping) {
          return mapping.host_port;
        }),
        hosts: [hostName]
      };
    }

    return { ports, hosts: this.getIPAddresses(task) };
  },

  /**
   * Returns a list of ports, if ports is available in discovery it will return
   * those, otherwise it will fall back on ports property on the task
   * @param  {object} task to return ports from
   * @return {Array.<number>} an array of port numbers
   */
  getPorts(task = {}) {
    const ports = Util.findNestedPropertyInObject(
      task,
      "discovery.ports.ports"
    );

    // If there are no service ports, use task ports
    if (!ports || !ports.length) {
      return task.ports || [];
    }

    return ports.map(function(port) {
      return port.number;
    });
  },

  getTaskStatusSlug(task) {
    return task.state.substring("TASK_".length).toLowerCase();
  },

  getTaskStatusClassName(task) {
    const taskStatus = TaskUtil.getTaskStatusSlug(task);

    return `task-status-${taskStatus}`;
  },

  getPortMappings(task) {
    const { container } = task;
    if (!container || !container.type) {
      return null;
    }

    const portMappings = Util.findNestedPropertyInObject(
      container,
      `${container.type.toLowerCase()}.port_mappings`
    );

    if (!Array.isArray(portMappings)) {
      return null;
    }

    return portMappings;
  },

  getNetworkType(task) {
    const { container } = task;
    if (!container || !container.type) {
      return null;
    }

    return Util.findNestedPropertyInObject(
      container,
      `${container.type.toLowerCase()}.network`
    );
  },

  getIPAddresses(task) {
    const ipAddresses = Util.findNestedPropertyInObject(
      task,
      "statuses.0.container_status.network_infos.0.ip_addresses"
    ) || [];

    return ipAddresses.map(function(item) {
      return item.ip_address;
    });
  },

  getRegionName(task) {
    const node = this.getNode(task);
    if (!node) {
      return "(Local)";
    }

    const masterNode = CompositeState.getMasterNode();
    const nodeRegionName = node.getRegionName();
    const regionNameParts = [];

    if (nodeRegionName) {
      regionNameParts.push(nodeRegionName);
    }

    if (
      !nodeRegionName ||
      (masterNode && nodeRegionName === masterNode.getRegionName())
    ) {
      regionNameParts.push("(Local)");
    }

    return regionNameParts.join(" ");
  },

  getZoneName(task) {
    const node = this.getNode(task);
    if (!node) {
      return "(Local)";
    }

    const masterNode = CompositeState.getMasterNode();
    const nodeZoneName = node.getZoneName();
    const zoneNameParts = [];

    if (nodeZoneName) {
      zoneNameParts.push(nodeZoneName);
    }

    if (
      !nodeZoneName ||
      (masterNode && nodeZoneName === masterNode.getZoneName())
    ) {
      zoneNameParts.push("(Local)");
    }

    return zoneNameParts.join(" ");
  },

  getHostName(task) {
    const node = this.getNode(task);

    return node ? node.hostname : "";
  },

  getNode(task) {
    const nodesList = CompositeState.getNodesList();
    const node = nodesList
      .filter({
        ids: [task.slave_id]
      })
      .last();

    return node;
  }
};

module.exports = TaskUtil;
