import { describe, expect, it } from "vitest";
import { composeDetails, parseDetails } from "@/components/delivery-estimator/model";

describe("stop address details", () => {
  it("joins the filled parts with their labels, landmark last", () => {
    expect(composeDetails({ building: "12", floor: "3", apartment: "", landmark: "قدام الصيدلية" })).toBe(
      "عمارة 12 · الدور 3 · قدام الصيدلية",
    );
    expect(composeDetails({ building: " ", floor: "", apartment: "", landmark: "" })).toBe("");
  });

  it("parses back exactly what it composed", () => {
    const parts = { building: "7ب", floor: "أرضي", apartment: "5", landmark: "البوابة التانية" };
    expect(parseDetails(composeDetails(parts))).toEqual(parts);
  });

  it("keeps older free text as the landmark", () => {
    expect(parseDetails("الدور التالت، شقة على الشمال")).toEqual({
      building: "",
      floor: "",
      apartment: "",
      landmark: "الدور التالت، شقة على الشمال",
    });
    expect(parseDetails(null).landmark).toBe("");
  });
});
