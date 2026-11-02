# Temporal review — diagnostic only

Mean absolute consecutive grayscale pixel difference / 255; nominal uniform sample times, not exact original PTS. Downscale stretches ROI to 160x90.

Settings: {"requested_range": [0.0, 14.0], "interval_seconds": 0.1, "roi_normalized_xywh": [0.04, 0.25, 0.92, 0.6], "roi_coded_pixels_xywh": [51, 180, 1177, 432], "autorotate": false, "sample_raster": [160, 90], "samples": 140, "low_threshold": 0.001, "jump_threshold": 0.25, "min_low_seconds": 0.6, "expected_holds": [[1.7, 3.0], [5.0, 5.8], [8.7, 10.0], [12.0, 14.0]]}

Coverage: {"requested_samples": 140, "actual_decoded_samples": 140, "nominal_observed_range": [0.0, 13.9], "unmeasured_tail": [13.9, 14.0], "sample_count_matches_request": true, "note": "Nominal sampled-frame coverage, not continuous observation; any shortfall requires review."}

Low-change regions: [{"start": 0.0, "end": 0.7, "declared_hold_overlap": []}, {"start": 1.7, "end": 2.4, "declared_hold_overlap": [[1.7, 3.0]]}, {"start": 5.0, "end": 5.7, "declared_hold_overlap": [[5.0, 5.8]]}, {"start": 7.0, "end": 7.7, "declared_hold_overlap": []}, {"start": 8.7, "end": 9.4, "declared_hold_overlap": [[8.7, 10.0]]}, {"start": 12.0, "end": 13.9, "declared_hold_overlap": [[12.0, 14.0]]}]
Abrupt-change candidates: []

- Sampling can miss between-sample events or alias periodic motion; final unsampled tail is not measured.
- Background motion can mask a still subject; select a main-content ROI and inspect actual video.
- Reading holds and cuts can be intentional. High difference is not quality. No universal zero-stillness target.
- Grayscale/downscale miss color-only or small changes. No audio, semantic, full-decode or approval check.
- Hold declarations annotate overlap only, never remove findings or grant acceptance.

No visual pass/fail or human acceptance is inferred. Rewatch these regions AND intermediate frames.
