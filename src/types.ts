/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Language {
  name: string;
  percentage: number;
}

export interface Scores {
  codeQuality: number;
  consistency: number;
  documentation: number;
  originality: number;
  impact: number;
}

export interface RoastProfile {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  reposCount: number;
  followersCount: number;
  followingCount: number;
  joinedYear: string;
  grade: string;
  gradeTitle: string;
  gradeExplanation: string;
  roastBullets: string[];
  scores: Scores;
  languages: Language[];
  radarRoast: string;
  segmentRoast: string;
  comparisonRoast: string;
}

export interface LeaderboardItem {
  username: string;
  name: string;
  avatarUrl: string;
  grade: string;
}
