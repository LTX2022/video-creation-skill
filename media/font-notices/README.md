# Font provenance notes

These are verbatim copies of the installed Debian package copyright notices inspected on 2026-11-02, not font binaries and not a new license for the videos or repository.

- The semantic-cache example's historical README identifies Noto Sans CJK regular/bold; THREAD's source identifies the same. ORDER's `config.json` identifies Noto Serif CJK and URW Nimbus Sans.
- `noto-cjk-debian-copyright.txt`: upstream fonts are SIL Open Font License 1.1. Its text distinguishes the font software from documents created using it.
- `urw-base35-debian-copyright.txt`: upstream fonts are AGPL-3 with a Font exception. The stated exception expressly concerns PostScript/PDF embedding; do not describe it as an unrestricted all-media embedding license. The AGPL text also distinguishes program output from covered works. No font programs are embedded in these raster MP4 files or distributed here.
- These notices document the locally installed package licensing, not a cryptographic identification of the historical fonts used to encode every video. The 60-style montage does not retain a complete actual-font resolution manifest. Style CSS font preferences alone do not prove which fallback the historical SVG rasterizer used.

The videos are supplied for viewing under the owner's publication authorization; this does not automatically relicense video pixels, trademarks, fonts or third-party components under MIT. This is provenance documentation, not legal clearance.

## New 60-style Noto replacement

The newly rendered `60-styles-noto-overview.mp4` replaces—not relabels—the historical montage. Its isolated Fontconfig exposed only the two Noto CJK files whose SHA256 values are in `../preview-source/font-manifest.json`. Every generated SVG font-family was fixed to Noto Sans CJK SC. The historical missing-font-resolution caveat above does not describe this new render. Full technical checks are in `../preview-source/verification.json`; rendering is offline SVG, not Remotion/browser.
