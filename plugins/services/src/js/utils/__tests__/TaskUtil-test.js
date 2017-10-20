const TaskUtil = require("../TaskUtil");
const Node = require("#SRC/js/structs/Node");

describe("TaskUtil", function() {
  describe("#getHostAndPortList", function() {
    it("returns empty arrays if host and ports are not available", function() {
      expect(TaskUtil.getHostAndPortList()).toEqual({ ports: [], hosts: [] });
    });

    it("uses ips if network is BRIDGE and no port_mappings", function() {
      expect(
        TaskUtil.getHostAndPortList(
          {
            discovery: { ports: { ports: [{ number: 3 }] } },
            statuses: [
              {
                container_status: {
                  network_infos: [{ ip_addresses: [{ ip_address: "bar" }] }]
                }
              }
            ],
            container: { type: "FOO", foo: { network: "BRIDGE" } }
          },
          new Node({ hostname: "quis" })
        )
      ).toEqual({ ports: [3], hosts: ["bar"] });
    });

    it("uses port_mappings if set and network is BRIDGE", function() {
      expect(
        TaskUtil.getHostAndPortList(
          {
            container: {
              type: "FOO",
              foo: {
                port_mappings: [{ host_port: "foo" }, { host_port: "bar" }],
                network: "BRIDGE"
              }
            }
          },
          new Node({ hostname: "quis" })
        )
      ).toEqual({ ports: ["foo", "bar"], hosts: ["quis"] });
    });

    it("uses host name if network is HOST", function() {
      expect(
        TaskUtil.getHostAndPortList(
          { discovery: { ports: { ports: [{ number: 3 }] } } },
          new Node({ hostname: "foo" })
        )
      ).toEqual({ ports: [3], hosts: ["foo"] });
    });
  });

  describe("#getPorts", function() {
    it("returns task ports if discovery ports are not defined", function() {
      expect(TaskUtil.getPorts({ ports: [1, 2] })).toEqual([1, 2]);
    });

    it("returns an empty array if neither are defined", function() {
      expect(TaskUtil.getPorts()).toEqual([]);
    });

    it("uses discovery ports if available", function() {
      const result = TaskUtil.getPorts({
        discovery: { ports: { ports: [{ number: 3 }] } }
      });

      expect(result).toEqual([3]);
    });

    it("prefers discovery ports if both are available", function() {
      const result = TaskUtil.getPorts({
        ports: [1, 2],
        discovery: { ports: { ports: [{ number: 3 }] } }
      });

      expect(result).toEqual([3]);
    });
  });

  describe("#getPortMappings", function() {
    beforeEach(function() {
      this.instance = TaskUtil.getPortMappings({
        container: {
          type: "FOO",
          foo: { port_mappings: ["foo", "bar", "baz"] }
        }
      });
    });

    it("should handle empty container well", function() {
      expect(TaskUtil.getPortMappings({})).toEqual(null);
    });

    it("should handle empty type well", function() {
      expect(TaskUtil.getPortMappings({ container: {} })).toEqual(null);
    });

    it("should handle empty info well", function() {
      expect(TaskUtil.getPortMappings({ container: { type: "FOO" } })).toEqual(
        null
      );
    });

    it("should handle empty port mappings well", function() {
      expect(
        TaskUtil.getPortMappings({ container: { type: "FOO", foo: {} } })
      ).toEqual(null);
    });

    it("should handle if port mappings are is not an array", function() {
      expect(
        TaskUtil.getPortMappings({
          container: { type: "FOO", foo: { port_mappings: 0 } }
        })
      ).toEqual(null);
    });

    it("should provide port_mappings when available", function() {
      expect(this.instance).toEqual(["foo", "bar", "baz"]);
    });
  });

  describe("#getRegionName", function() {
    it("returns (Local) when no region name exists", function() {
      const node = {
        getRegionName() {
          return "";
        }
      };
      const masterNode = {
        getRegionName() {
          return "";
        }
      };
      expect(TaskUtil.getRegionName(node, masterNode)).toEqual("(Local)");
    });
    it("adds (Local) when no slave/ master in the same region", function() {
      const node = {
        getRegionName() {
          return "us-west-2";
        }
      };
      const masterNode = {
        getRegionName() {
          return "us-west-2";
        }
      };
      expect(TaskUtil.getRegionName(node, masterNode)).toEqual(
        "us-west-2 (Local)"
      );
    });
    it("returns region when slave/ master in different region", function() {
      const node = {
        getRegionName() {
          return "us-west-2";
        }
      };
      const masterNode = {
        getRegionName() {
          return "us-west-3";
        }
      };
      expect(TaskUtil.getRegionName(node, masterNode)).toEqual("us-west-2");
    });
  });

  describe("#getZoneName", function() {
    it("returns (Local) when no zone name exists", function() {
      const node = {
        getZoneName() {
          return "";
        }
      };
      const masterNode = {
        getZoneName() {
          return "";
        }
      };
      expect(TaskUtil.getZoneName(node, masterNode)).toEqual("(Local)");
    });
    it("adds (Local) when no slave/ master in the same zone", function() {
      const node = {
        getZoneName() {
          return "us-west-2";
        }
      };
      const masterNode = {
        getZoneName() {
          return "us-west-2";
        }
      };
      expect(TaskUtil.getZoneName(node, masterNode)).toEqual(
        "us-west-2 (Local)"
      );
    });
    it("returns zone when slave/ master in different zone", function() {
      const node = {
        getZoneName() {
          return "us-west-2";
        }
      };
      const masterNode = {
        getZoneName() {
          return "us-west-3";
        }
      };
      expect(TaskUtil.getZoneName(node, masterNode)).toEqual("us-west-2");
    });
  });
});
