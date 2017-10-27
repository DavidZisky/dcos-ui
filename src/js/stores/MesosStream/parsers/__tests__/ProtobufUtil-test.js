import * as ProtobufUtil from "../ProtobufUtil";

describe("ProtobufUtil", function() {
  describe("#scalar", function() {
    it("returns scalar value", function() {
      expect(ProtobufUtil.scalar({ value: 1 })).toBe(1);
    });
  });
});
