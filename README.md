# Tailor

A tool for analyzing and fixing the FCC [broadband serviceable location fabric](https://help.bdc.fcc.gov/hc/en-us/articles/5375384069659-What-is-the-Location-Fabric-)

![Screenshot](docs/screenshot.png)

## Introduction

If you...

- Have a copy of the fabric
- Need to submit bulk location [challenges](https://help.bdc.fcc.gov/hc/en-us/categories/8772052687003-Challenge-Processes)
- Know your way around GIS software (ArcGIS or QGIS)
- Have permission to install software on your computer

... keep reading!

Tailor will analyze your copy of the fabric and compare it to the ground-truth data you provide. At the end, you'll have GIS layers of potentially missing locations, faulty fabric addresses, and more. You can review these findings and submit the ones you choose as bulk location challenges.

There's no coding necessary, though it helps if you're familiar with your computer's [command line](https://www.pcmag.com/encyclopedia/term/command-line).

### What ground-truth data do I need?

In addition to the fabric, you'll need parcels and building footprints. Tailor can go farther if you have address points (aka "911 addresses"), but these aren't required. Also, a geographic boundary is helpful if you have one, such as city or county limits.

### Where can I find ground-truth data?

A good place to start is by asking your central IT department, GIS team, and/or assessor's office if they can help you track down the above data. If you strike out with them — don't give up! There's a good chance you can still find it as open data.

For address points, [OpenAddresses](https://openaddresses.io/) is a collection of public-domain address data from government sources. We've heard stories of people being told their jurisdiction didn't have address points, only to find them there.

OpenAddresses has some building footprints and parcels, though not as many. For buildings, a good fallback is Microsoft's [U.S. Building Footprints](https://github.com/microsoft/USBuildingFootprints#download-links). The data quality isn't perfect, but it covers all 50 states. For parcels, sometimes Googling "[your county] parcels gis" can turn up results.

For geographic boundaries, the [Census Bureau](https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html) may have what you need, or [geoBoundaries](https://www.geoboundaries.org/).

⚠️ A general caveat to open data: don't be alarmed if you see something goofy here and there (e.g. a building that was demolished years ago). It may not be perfect, but odds are, you'll still find legitimate errors in the fabric.

### I'm not supposed to share the fabric. Can I still use Tailor?

Great question! Tailor runs entirely on your machine and doesn't upload or share your data anywhere. When you're finished submitting challenges, you can delete it entirely. It's also an open-source project, so you can have someone you trust review the code here. If you still have legal concerns, we recommend seeking counsel and/or contacting FCC.

### Where can I get help and plug in?

Become a part of the Tailor community by joining the [Discord server](https://discord.gg/xmPmDTnRHb)! That's the best place to connect with other users and troubleshoot problems.

For occasional product updates, such as new versions, consider joining the [Google Group](https://groups.google.com/g/broadband-tailor-users).

## Installation

🚧 coming soon

## Usage

🚧 coming soon
