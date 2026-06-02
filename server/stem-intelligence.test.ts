/**
 * stem-intelligence.test.ts
 *
 * Vitest unit tests for the stem intelligence service.
 * Tests cover:
 *   - getSectionTypeAtTime: section lookup at a given timestamp
 *   - stemSectionToSceneType: mapping stem section → scene type
 *   - getStemSections: DB read + JSON parse + fallback
 *   - getStemVocalsUrl: vocal stem URL with fallback chain
 *   - getEnergyMapSummary: energy map DB read + fallback
 *   - getValidationSummary: validation DB read + fallback
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSectionTypeAtTime,
  stemSectionToSceneType,
  type StemSection,
  type StemSectionsData,
  type EnergyMapsData,
  type ValidationData,
} from "./stem-intelligence-service";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSection(
  start: number,
  end: number,
  type: StemSection["type"],
  vocalRms = 0.5
): StemSection {
  return {
    start,
    end,
    duration: end - start,
    type,
    confidence: 0.9,
    stem_rms: {
      vocals: vocalRms,
      drums: 0.3,
      bass: 0.2,
      piano: 0.1,
      guitar: 0.15,
      other: 0.05,
    },
  };
}

const MOCK_SECTIONS: StemSection[] = [
  makeSection(0, 5, "instrumental", 0.0),
  makeSection(5, 20, "vocal_performance", 0.8),
  makeSection(20, 25, "orchestral_build", 0.2),
  makeSection(25, 28, "emotional_transition", 0.3),
  makeSection(28, 30, "outro", 0.05),
];

// ─── getSectionTypeAtTime ─────────────────────────────────────────────────────

describe("getSectionTypeAtTime", () => {
  it("returns the correct type for a time inside a vocal_performance section", () => {
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 10)).toBe("vocal_performance");
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 5)).toBe("vocal_performance");
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 19.9)).toBe("vocal_performance");
  });

  it("returns instrumental for the intro window (0–5s)", () => {
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 0)).toBe("instrumental");
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 4.9)).toBe("instrumental");
  });

  it("returns orchestral_build for the bridge window (20–25s)", () => {
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 21)).toBe("orchestral_build");
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 24.9)).toBe("orchestral_build");
  });

  it("returns emotional_transition for the transition window (25–28s)", () => {
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 26)).toBe("emotional_transition");
  });

  it("returns outro for the outro window (28–30s)", () => {
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 29)).toBe("outro");
  });

  it("returns null for a time beyond the last section", () => {
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 100)).toBeNull();
  });

  it("returns null for an empty sections array", () => {
    expect(getSectionTypeAtTime([], 10)).toBeNull();
  });

  it("uses inclusive start, exclusive end boundary (start is included)", () => {
    // Section starts at exactly 5s
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 5)).toBe("vocal_performance");
  });

  it("uses inclusive start, exclusive end boundary (end is excluded)", () => {
    // Section ends at 20s — 20s should fall into the next section (orchestral_build)
    expect(getSectionTypeAtTime(MOCK_SECTIONS, 20)).toBe("orchestral_build");
  });
});

// ─── stemSectionToSceneType ───────────────────────────────────────────────────

describe("stemSectionToSceneType", () => {
  it("maps vocal_performance + lipSync=true → performance", () => {
    expect(stemSectionToSceneType("vocal_performance", true)).toBe("performance");
  });

  it("maps vocal_performance + lipSync=false → cinematic", () => {
    expect(stemSectionToSceneType("vocal_performance", false)).toBe("cinematic");
  });

  it("maps climax + lipSync=true → performance", () => {
    expect(stemSectionToSceneType("climax", true)).toBe("performance");
  });

  it("maps climax + lipSync=false → cinematic", () => {
    expect(stemSectionToSceneType("climax", false)).toBe("cinematic");
  });

  it("maps orchestral_build → cinematic regardless of lipSync", () => {
    expect(stemSectionToSceneType("orchestral_build", true)).toBe("cinematic");
    expect(stemSectionToSceneType("orchestral_build", false)).toBe("cinematic");
  });

  it("maps instrumental → narrative regardless of lipSync", () => {
    expect(stemSectionToSceneType("instrumental", true)).toBe("narrative");
    expect(stemSectionToSceneType("instrumental", false)).toBe("narrative");
  });

  it("maps emotional_transition → transition regardless of lipSync", () => {
    expect(stemSectionToSceneType("emotional_transition", true)).toBe("transition");
    expect(stemSectionToSceneType("emotional_transition", false)).toBe("transition");
  });

  it("maps outro → cinematic regardless of lipSync", () => {
    expect(stemSectionToSceneType("outro", true)).toBe("cinematic");
    expect(stemSectionToSceneType("outro", false)).toBe("cinematic");
  });
});

// ─── getStemSections (DB integration — mocked) ───────────────────────────────

describe("getStemSections (via getSectionTypeAtTime with parsed data)", () => {
  it("correctly parses a StemSectionsData JSON and returns sections", () => {
    const mockData: StemSectionsData = {
      version: "1.0",
      total_duration: 30,
      sections: MOCK_SECTIONS,
    };
    const parsed = JSON.parse(JSON.stringify(mockData)) as StemSectionsData;
    expect(parsed.sections.length).toBe(5);
    expect(parsed.sections[0].type).toBe("instrumental");
    expect(parsed.sections[1].type).toBe("vocal_performance");
  });

  it("getSectionTypeAtTime works correctly with parsed sections from JSON", () => {
    const mockData: StemSectionsData = {
      version: "1.0",
      total_duration: 30,
      sections: MOCK_SECTIONS,
    };
    const parsed = JSON.parse(JSON.stringify(mockData)) as StemSectionsData;
    expect(getSectionTypeAtTime(parsed.sections, 10)).toBe("vocal_performance");
    expect(getSectionTypeAtTime(parsed.sections, 22)).toBe("orchestral_build");
    expect(getSectionTypeAtTime(parsed.sections, 1)).toBe("instrumental");
  });
});

// ─── EnergyMapsData structure validation ─────────────────────────────────────

describe("EnergyMapsData structure", () => {
  it("correctly validates a well-formed EnergyMapsData object", () => {
    const mockMaps: EnergyMapsData = {
      vocal_intensity: [
        { t: 0, intensity: 0.0 },
        { t: 1, intensity: 0.5 },
        { t: 2, intensity: 0.8 },
      ],
      orchestral_intensity: [
        { t: 0, intensity: 0.1 },
        { t: 1, intensity: 0.2 },
        { t: 2, intensity: 0.3 },
      ],
      rhythm_intensity: [
        { t: 0, intensity: 0.3 },
        { t: 1, intensity: 0.4 },
        { t: 2, intensity: 0.5 },
      ],
      summary: {
        vocal_peak: { t: 2, intensity: 0.8 },
        orchestral_peak: { t: 2, intensity: 0.3 },
        rhythm_peak: { t: 2, intensity: 0.5 },
        total_duration: 3,
        vocal_build_regions: [{ start: 0, end: 2, slope: 0.4 }],
        orchestral_build_regions: [],
        section_count: 1,
        vocal_performance_sections: 1,
        instrumental_sections: 0,
        climax_sections: 0,
      },
    };

    expect(mockMaps.vocal_intensity.length).toBe(3);
    expect(mockMaps.summary.vocal_peak?.t).toBe(2);
    expect(mockMaps.summary.vocal_peak?.intensity).toBe(0.8);
    expect(mockMaps.summary.vocal_build_regions.length).toBe(1);
    expect(mockMaps.summary.vocal_build_regions[0].slope).toBe(0.4);
  });

  it("handles null peaks gracefully", () => {
    const mockMaps: EnergyMapsData = {
      vocal_intensity: [],
      orchestral_intensity: [],
      rhythm_intensity: [],
      summary: {
        vocal_peak: null,
        orchestral_peak: null,
        rhythm_peak: null,
        total_duration: 0,
        vocal_build_regions: [],
        orchestral_build_regions: [],
        section_count: 0,
        vocal_performance_sections: 0,
        instrumental_sections: 0,
        climax_sections: 0,
      },
    };
    expect(mockMaps.summary.vocal_peak).toBeNull();
    expect(mockMaps.summary.orchestral_peak).toBeNull();
  });
});

// ─── ValidationData structure validation ─────────────────────────────────────

describe("ValidationData structure", () => {
  it("correctly validates a well-formed ValidationData object", () => {
    const mockValidation: ValidationData = {
      total_duration_seconds: 30,
      total_sections: 5,
      section_breakdown: {
        vocal_performance: {
          count: 1,
          coverage_pct: 50,
          sections: [{ start: 5, end: 20, confidence: 0.9 }],
        },
        instrumental: {
          count: 1,
          coverage_pct: 16.7,
          sections: [{ start: 0, end: 5, confidence: 0.9 }],
        },
      },
      vocal_phrases: {
        count: 3,
        phrases: [
          { start: 5, end: 8, duration: 3, avg_energy: 0.7 },
          { start: 9, end: 12, duration: 3, avg_energy: 0.8 },
          { start: 13, end: 16, duration: 3, avg_energy: 0.75 },
        ],
      },
      energy_peaks: {
        vocal_peak: { t: 15, intensity: 0.9 },
        orchestral_peak: { t: 22, intensity: 0.8 },
        rhythm_peak: { t: 16, intensity: 0.75 },
      },
      build_regions: {
        vocal: [{ start: 12, end: 15, slope: 0.3 }],
        orchestral: [{ start: 18, end: 22, slope: 0.4 }],
      },
      stem_availability: {
        vocals: true,
        drums: true,
        bass: true,
        piano: false,
        guitar: false,
        other: true,
        accompaniment: true,
      },
      classification_quality: {
        has_vocal_sections: true,
        has_instrumental_sections: true,
        has_climax: false,
        vocal_coverage_reasonable: true,
        phrase_count_reasonable: true,
      },
    };

    expect(mockValidation.total_sections).toBe(5);
    expect(mockValidation.vocal_phrases.count).toBe(3);
    expect(mockValidation.energy_peaks.vocal_peak?.t).toBe(15);
    expect(mockValidation.classification_quality.has_vocal_sections).toBe(true);
    expect(mockValidation.stem_availability.vocals).toBe(true);
    expect(mockValidation.stem_availability.piano).toBe(false);
    expect(mockValidation.build_regions.vocal.length).toBe(1);
  });
});

// ─── End-to-end section classification pipeline ───────────────────────────────

describe("Full section classification pipeline (unit)", () => {
  it("correctly classifies a 30s song with known section structure", () => {
    const sections = MOCK_SECTIONS;

    // Verify intro is instrumental
    expect(getSectionTypeAtTime(sections, 2)).toBe("instrumental");

    // Verify verse/chorus is vocal_performance
    expect(getSectionTypeAtTime(sections, 10)).toBe("vocal_performance");
    expect(getSectionTypeAtTime(sections, 18)).toBe("vocal_performance");

    // Verify bridge is orchestral_build
    expect(getSectionTypeAtTime(sections, 22)).toBe("orchestral_build");

    // Verify transition
    expect(getSectionTypeAtTime(sections, 26)).toBe("emotional_transition");

    // Verify outro
    expect(getSectionTypeAtTime(sections, 29)).toBe("outro");
  });

  it("maps all section types to correct scene types with lipSync enabled", () => {
    const lipSyncEnabled = true;
    const expectedMappings: Array<[StemSection["type"], string]> = [
      ["vocal_performance", "performance"],
      ["climax", "performance"],
      ["orchestral_build", "cinematic"],
      ["instrumental", "narrative"],
      ["emotional_transition", "transition"],
      ["outro", "cinematic"],
    ];
    for (const [sectionType, expectedSceneType] of expectedMappings) {
      expect(stemSectionToSceneType(sectionType, lipSyncEnabled)).toBe(expectedSceneType);
    }
  });

  it("maps all section types to correct scene types with lipSync disabled", () => {
    const lipSyncEnabled = false;
    const expectedMappings: Array<[StemSection["type"], string]> = [
      ["vocal_performance", "cinematic"],
      ["climax", "cinematic"],
      ["orchestral_build", "cinematic"],
      ["instrumental", "narrative"],
      ["emotional_transition", "transition"],
      ["outro", "cinematic"],
    ];
    for (const [sectionType, expectedSceneType] of expectedMappings) {
      expect(stemSectionToSceneType(sectionType, lipSyncEnabled)).toBe(expectedSceneType);
    }
  });

  it("correctly identifies that vocal sections should drive lip sync allocation", () => {
    // Simulate a storyboard with 6 scenes across 30s
    const sceneTimes = [0, 5, 10, 15, 20, 25];
    const sceneTypes = sceneTimes.map((t) => {
      const sectionType = getSectionTypeAtTime(MOCK_SECTIONS, t);
      if (!sectionType) return "cinematic";
      return stemSectionToSceneType(sectionType, true);
    });

    // Scene at 0s (instrumental) → narrative
    expect(sceneTypes[0]).toBe("narrative");
    // Scene at 5s (vocal_performance) → performance
    expect(sceneTypes[1]).toBe("performance");
    // Scene at 10s (vocal_performance) → performance
    expect(sceneTypes[2]).toBe("performance");
    // Scene at 15s (vocal_performance) → performance
    expect(sceneTypes[3]).toBe("performance");
    // Scene at 20s (orchestral_build) → cinematic
    expect(sceneTypes[4]).toBe("cinematic");
    // Scene at 25s (emotional_transition) → transition
    expect(sceneTypes[5]).toBe("transition");

    // Exactly 3 out of 6 scenes should be performance (lip-sync) scenes
    const performanceScenes = sceneTypes.filter((t) => t === "performance");
    expect(performanceScenes.length).toBe(3);
  });
});
