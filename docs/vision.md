# Faceplate

Vision document for Faceplate.me service
Written May 30, 2026 by Jeff James <jeff@thronebuilder.com>
Provided as input to SpecKit and Claude Code

## High-level

Goal: Accelerate creation of face plates for Hall of Faces

Context: I have designed 8 faces using a highly manual process. Let's build faceplate.me to automate and crowd source this

Constitution
1. Mosaic results that people value, build and share
2. Simple, friendly design to promote individual & project use
3. Complete, high-quality code to add to my project portfolio 
4. Respect intellectual property of algorithms and lego-art-remix creator
5. Fast website performance

Functional Uses
1. Generate my future faceplates with this
2. Invite friends to submit for me
3. Cite at BrickCon for self-serve faceplates
4. Use ahead of appearances to gather faces for Hall of Faces exhibition
5. Build community with BrickCon, BrickLink, Studio and the rest of the Lego community

Coding Uses
1. Add to my portfolio at github.com/ThroneBuilder
2. Refine how I use SpecKit on larger projects
3. Assess how to handle image algorithms
4. Discover APIs and file formats for Lego ecosystem

## Lego Art Remix

Replicate this work, respecting intellecutal property
- Service at https://lego-art-remix.com/
- Code at https://github.com/debkbanerji/lego-art-remix

Options in that UI
1. Interpolation
	1. Browser Default
    2. Average Pooling 
	3. Dual Min Max Pooling 
	4. Min Pooling 
	5. Max Pooling 
2. HSV	
    1. Hue in [-180,180] purple to green
	2. Saturation in[-100,100] grey to vibrant
	3. Value [-100,100]: dark to mono
3. Brightness [-128,128]
4. Contrast [-128,128]
5. Pixel Piece
    Always 1x2 Square Plate
	This choice dictates available colors
6. Color distance algorithm
    1. Euclidean RGB 
    2. Euclidean LAB 
    3. CIE94 
    4. CIEDE2000 
    5. DIN990 
7. Output
    Pieces used
	Instructions (color matrix)

## Current process

My existing manual process to generate faceplates today using that website

1. Photograph a face with eye closed in soft light
2. Crop photo square, large adult heads filling the frame 
3. Run through Lego Art Remix
    1. Resolution 32x32
    2. Adjust brightness & contrast
    3. Not algorithm, HSV, distance
4. Crop image down to just the face
5. Build backing plate from 16x16 to match cropped image
6. Ensure 1x1 plates in colors per parts list, adjusting for crop
7. Follow LAR plan to place tiles on mounting plate

## Speculative automation/human partition

Minimal human steps
1. Providing an image via camera or & face mosaic
2. Following directions to build the mounting plate
and face mosaic

Automatable human steps
1. Camera access
2. Getting the right shot with lighting
3. Cropping & angling the shot properly according to face size
4. Tuning remix brightness & contrast
5. Trim remix result down to just the face
6. Design the mounting plate build of overlapping plates

## Proposed new workflow

1. Introduction page
    1. Brand site as Throne Builder's Faceplate.me
    2. Automation Hall of Faces work with link to that project
    3. Cite purpose of building face mosaic with plate trimmed to face edge for use in Hall of Faces cubbies or independent standalone art
	4. Outline interaction
	    1. Take photo
	    2. Tune the outcome
	    3. Save design for implementation
	5. Checkbox options under "Share with ThroneBuilder?"
	    [x] Share choices to improve site
	    [x] Share input & output image for project: [project-name]
    6. Project name text field enabled with that second checkbox
    7. "Next, provide a face"
    8. Continue button
2. Camera page
    1. Choice to upload image with [select file] option or enable camera
    2. Checkbox [x] my face is small - to avoid results bigger than their actual head
	3. Option to take [3] photos [1] second apart
    4. "Next, capture and tweak those images"
	5. Continue button
3. Photo prep background calculation
    1. Prepare photos - trim & scale smaller faces
	2. Default brightness x contrast or range of options based on iterative workflow
4. Photo page
    Show a selection of images from the prior steps
    1. Choose one or more photos to work with
    2. "Next, generate more options or produce candidates"
    3. Iterate button enabled when 1 or more chosen
    4. Continue button enabled when exactly 1 chosen
5. Candidate prep
    1. Run those photos through the algorithm with a variety of settings
    2. Vary brightness x contrast
	3. Maybe vary interpolation x distance algorithm, though I used the default in my manual workflow
5. Candidate page
    Show a selection of Lego patterns from the prior steps
    1. Chose one or more candidates to work with
    2. "Next, generate more options or produce final design"
    3. Iterate button enabled when 1 or more chose
    3. Continue button enabled when exactly 1 chosen
6. Results prep
    1. Finalize input, backing, and mosaic images
	2. Design backing plate assembly & parts
	3. Finalize parts list, backing & mosaic instructions
	4. Log results
7. Results page
    1. Show side-by-side: Input image | Plate outline | Mosaic result
	2. Show below them: Parts list | Backing instructions | Mosaic instructions
	3. [x] Share input & output image for project: [project-name]
    4. Project name text field enabled with that  checkbox
    5. "Next, save your results "
	6. Save button to Export to PDF

## Key Questions

1. Do we need to use an LLM? Do this service need LLM access or can this be done algorithmically?
	1. Trimming the image down to the face
	2. Iterating on options around the selected images
	3. Designing the backing plate layers with proper overlap of known parts
2. How to respect intellectual property?
    1. Should we get Deb's permission? Do I need to notify Deb or get her permission or collaboration?

## High level planning phases

1. Phase 1 steps through the most basic end-to-end implementation
	1. Website with introduction  & camera page
	2. Photo page with camera face capture & top-bottom trimming
	3. Candidate page replicating lego-art-remix algorithm with default settings
	4. Results page with backing plate design including photo trim & plate layering design
	5. Include a back button on each page

3. Phase 2 fleshes out the full desired iterative workflow
	1. Introduction page sharing options
	2. Camera page option of face size (for smaller than 32-high) and 
	3. Photo page selection of multiple images
	4. Candidate page selection of multiple images & iteration
	5. Results page export actions

3. Phase 3 and beyond add additional features of telemetry, projects, control, ecosystem, outlined below

## Additional features

1. Telemetry
    1. Save state to local user session cookie
    2. Save session logs to persistent drive for my data mining
    3. Create subsite for analyzing those logs
    4. On that site, report user experience, including completion rate & iterations
    5. On that site, report preferred settings, variance

2. Projects
    1. Pass ?Project=BrickCon2026 in URL/QRCode
    2. Save designs to project directory on persistent drive
    3. Create subsite directories for public projects like /BrickCon2026/ with galleries of submissions
    4. Create /projects subset for finding and viewing those collections with

3. Variance control
    1. Camera page options for photo prep: How many photos to take and time gap between
    2. Photo page options for candidate prep: Setting average & sample variance for brightness & contrast
    3. Candidate page options for results prep: include stand design in brick inventory & instructions
    4. I have a design for the stand but will need to encode this somehow, such as a Lego Studio project to import from

4. Ecosystem integration
    1. Import stand design from Lego Studio
    2. Results page option to export inventory to BrickLink into Wanted List
    3. Results page option to export design to Lego Studio for instructions