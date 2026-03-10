# Feature Landscape

**Domain:** AI-powered treatment recording and electronic karte for wellness practitioners
**Researched:** 2026-03-07
**Overall confidence:** MEDIUM-HIGH

## Table Stakes

Features users expect from an AI karte / treatment recording system. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Session audio recording | Core function -- practitioner presses record, audio is captured | Medium | Requires MediaRecorder API, chunked upload to cloud storage. Must work on mobile browsers. Hands-free start/stop is critical for practitioners mid-treatment. |
| AI-generated treatment notes from recording | The entire value proposition -- practitioner records, AI produces structured notes | High | Pipeline: audio -> transcription -> LLM summarization -> structured karte. Requires STT provider + LLM. Template-aware output (SOAP, free-form, business-specific). |
| Live transcription during recording | Practitioners expect to see words appearing as they speak | High | Requires WebSocket streaming to STT provider (Deepgram Nova-3 supports Japanese streaming). Sub-300ms latency target. Dual display: original language + translated text. |
| Karte per visit (linked to booking) | Each appointment produces one treatment record | Medium | New `Karte` model linked to `Booking` and `Customer`. Extends existing `MedicalRecord` concept. Stores transcript, AI summary, tags, practitioner edits. |
| Customer karte history | Practitioner browses past treatment records for a customer | Low | List/timeline view filtered by customerId. Already have `MedicalRecord` relation on `Customer`. Needs search/filter by date, tags, content. |
| Practitioner editing of AI notes | AI output is a draft, practitioner must be able to correct | Medium | Rich text or structured form editing. Version history so original AI output is preserved alongside edits. |
| Auto-detected current customer | System knows who is being treated based on booking time | Low | Query bookings where `startsAt <= now <= endsAt` for the logged-in worker. Display banner with customer name. Already have booking data with worker/customer/time. |
| Today's appointments with karte access | Dashboard showing today's schedule with quick links to start/view karte | Low | Filter bookings by today's date, join with existing karte records. Show status: no karte, recording, completed. |
| Audio playback | Practitioner can replay session recordings | Low | Store audio in cloud storage (Supabase Storage or S3), stream playback via HTML5 audio element. |
| Business type templates | Different wellness businesses document different things | Medium | Template system: hair salon tracks products/techniques, seitai tracks pain points/adjustments, dental tracks teeth/procedures. Template defines which fields and tags are relevant. |

### Japan-Specific Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Japanese transcription accuracy | Primary language of practitioners and clients | High | Deepgram Nova-3 supports Japanese streaming with code-switching. Must handle medical/wellness terminology (seitai, shiatsu vocabulary). Custom vocabulary/glossary support needed. |
| Bilingual interface | Existing app is ja/en, karte UI must follow | Low | Already have i18n infrastructure. New karte-related strings in both languages. |
| Japanese text in karte output | AI-generated notes should be in Japanese by default | Medium | LLM prompt engineering to output Japanese. Template labels in Japanese. Date formatting (YYYY/MM/DD Japanese convention). |


## Differentiators

Features that set SYNQ Karte apart. Not expected in typical booking software, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live ja<->en translation | Foreign practitioners/clients can participate naturally; transcript shows both languages side by side | Very High | Requires real-time translation layer on top of transcription. Could use LLM for translation (slower, higher quality) or dedicated translation API. Deepgram Nova-3 code-switching helps but is not full translation. |
| Auto-tagging (symptoms, treatments, products) | Practitioners get structured data without manual entry; enables search and analytics | High | NLP entity extraction from transcript. Domain-specific tag taxonomy per business type. LLM-based extraction is most practical (vs traditional NER). Tags feed into customer history timeline. |
| AI provider selection | Practitioners choose their preferred AI (OpenAI, Anthropic, Google, local models) | Medium | Abstraction layer over multiple LLM providers for summarization. STT provider is separate concern (Deepgram recommended as primary). Settings UI for API key entry, model selection, cost tracking. |
| Cross-visit pattern detection | AI identifies trends across multiple visits (recurring symptoms, treatment effectiveness) | Very High | Requires aggregating karte history, running LLM analysis across multiple records. Deferred feature -- needs substantial karte data first. |
| Voice commands during recording | "Mark this as important" or "Add tag: shoulder pain" spoken during session | High | Requires wake-word or command detection in the transcription stream. Complex UX and error-prone. Better as v2 feature. |
| Waveform visualization | Visual feedback during recording showing audio levels | Low | Web Audio API analyser node. Already in prototype mockup. Provides confidence that recording is working. |
| Photo attachment to karte | Before/after photos, body diagrams annotated | Medium | Existing `MedicalRecord` model already supports `imageUrl`. Extend to karte with multiple image slots. Camera capture on mobile. |


## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Video recording of sessions | Privacy nightmare, massive storage costs, no clear value over audio for documentation purposes | Audio-only recording with optional photo attachments |
| Real-time AI coaching during session | Distracts practitioner from patient care, unreliable advice liability | Post-session AI summary only. Live transcription is for monitoring, not advising. |
| Patient self-service portal for karte | Scope creep into patient portal territory; wellness karte is practitioner-facing documentation | Keep karte admin-only. Customer-facing features stay in booking system. |
| HIPAA/medical-grade compliance | SYNQ targets wellness (salon, massage, seitai), not regulated medical (hospital, clinic). Pursuing medical compliance adds enormous cost and complexity. | Clear disclaimer that this is wellness documentation, not medical records. Follow reasonable security practices (encryption at rest, access controls) without claiming medical compliance. |
| Offline-first recording | Complexity of offline audio storage, sync conflicts, and partial upload recovery | Require internet connection. Show clear warning if connection drops during recording. Save audio chunks progressively to prevent total loss. |
| Custom AI model training | Per-business fine-tuned models are expensive and maintenance-heavy | Use prompt engineering with business templates to customize output. Few-shot examples in prompts rather than model training. |


## Feature Dependencies

```
Booking System (exists) -> Auto-detected current customer
Booking System (exists) -> Today's appointments dashboard
Booking System (exists) -> Karte per visit (linked to Booking)
Customer Model (exists) -> Customer karte history

Audio Recording -> Live Transcription (recording feeds audio stream)
Audio Recording -> AI-generated treatment notes (recording produces audio file)

Live Transcription -> Live Translation (translation operates on transcription output)
Live Transcription -> Auto-tagging (tags extracted from transcript text)

Business Type Templates -> AI-generated treatment notes (template shapes LLM output)
Business Type Templates -> Auto-tagging (template defines tag taxonomy)

AI Provider Configuration -> AI-generated treatment notes (provider executes summarization)
AI Provider Configuration -> Auto-tagging (provider executes entity extraction)
AI Provider Configuration -> Live Translation (provider may execute translation)

Karte per visit -> Customer karte history (history is collection of kartes)
Karte per visit -> Practitioner editing (editing operates on karte content)
```

## User Workflows

### Primary Workflow: Recording -> Karte

```
1. Practitioner opens dashboard, sees today's bookings
2. Current booking auto-highlighted based on time
3. Practitioner taps "Start Recording" on current booking
4. Recording page shows: timer, waveform, live transcript
5. (Optional) Live translation appears alongside transcript
6. Practitioner ends recording when session complete
7. Audio uploads, AI generates structured karte draft
8. Practitioner reviews, edits, and finalizes karte
9. Karte saved and linked to booking/customer
10. Customer history updated with new karte entry
```

### Secondary Workflow: Review History

```
1. Practitioner searches/selects customer
2. Views timeline of past kartes
3. Can filter by tag (e.g., "shoulder pain"), date range
4. Opens individual karte to review details
5. Can play back audio from past sessions
6. (Future) AI summarizes trends across visits
```

### Settings Workflow: Configuration

```
1. Admin navigates to Settings
2. Selects business type template (hair salon, seitai, etc.)
3. Template pre-configures: tag taxonomy, karte fields, AI prompt style
4. Configures AI provider (enters API key, selects model)
5. Tests configuration with sample recording
```

## Business Template Concept

Templates customize the karte system per business type without requiring custom code.

| Business Type | Key Fields | Tag Categories | Note Style |
|---------------|-----------|----------------|------------|
| Hair Salon | Products used, techniques, color formulas, styling notes | Products, Techniques, Hair condition | Free-form with product list |
| Seitai / Chiropractic | Pain locations, adjustment techniques, range of motion | Symptoms, Body areas, Techniques, Severity | Body-area structured (head, neck, shoulders, back, etc.) |
| Massage / Bodywork | Pressure preferences, problem areas, techniques used | Body areas, Techniques, Pressure level | Session flow notes |
| Esthetique / Skin Care | Skin condition, products applied, treatment areas | Skin concerns, Products, Treatment zones | Condition tracking with before/after |
| Dental | Teeth affected, procedures, materials used | Teeth numbers, Procedures, Materials | Tooth chart structured |
| Acupuncture | Meridians, point selections, needle techniques | Meridians, Points, Symptoms | Point-map structured |

Templates are stored as JSON configuration defining:
- `fields`: array of field definitions (name, type, required)
- `tagCategories`: array of tag groups with suggested values
- `promptTemplate`: LLM prompt suffix for business-specific summarization
- `karteLayout`: which sections to show in the karte view

## MVP Recommendation

Prioritize for first release:

1. **Audio recording with progressive upload** -- the foundation everything else depends on
2. **Post-session AI karte generation** -- the core value proposition (transcribe audio, generate structured notes)
3. **Karte per visit linked to booking** -- connects to existing data model
4. **Customer karte history browsing** -- practitioners need to review past records
5. **Business type templates (2-3 types)** -- start with seitai and hair salon templates
6. **Auto-detected current customer banner** -- quality of life, leverages existing booking data
7. **Today's appointments with karte status** -- dashboard integration

Defer to v2:
- **Live transcription**: Requires WebSocket streaming infrastructure, significantly more complex than batch transcription. Can ship v1 with post-session transcription only.
- **Live translation**: Depends on live transcription. High complexity, niche use case.
- **Auto-tagging**: Can be added to the post-session AI pipeline after core karte generation is validated.
- **AI provider selection**: Start with one provider (OpenAI or Anthropic), add provider abstraction later.
- **Cross-visit pattern detection**: Needs accumulated data to be useful.
- **Voice commands**: Experimental, error-prone, low priority.

## Sources

- [Best AI Medical Scribes 2026](https://www.soapnoteai.com/soap-note-guides-and-example/best-ai-medical-scribes-2026/) -- AI scribe landscape and feature expectations
- [Real-Time Medical Transcription with AssemblyAI and GPT-4](https://earezki.com/ai-news/2026-03-02-build-a-real-time-medical-transcription-analysis-app-with-assemblyai-and-llm-gateway/) -- Architecture patterns for recording-to-notes pipeline
- [How to Build a Virtual Medical Scribe (Deepgram)](https://deepgram.com/learn/how-to-build-a-virtual-medical-scribe-using-deepgram-and-openai) -- WebSocket streaming architecture
- [How to Build an AI Medical Scribe (AssemblyAI)](https://www.assemblyai.com/blog/how-to-build-ai-medical-scribe) -- Ambient scribe workflow patterns
- [Deepgram Japanese Speech-to-Text](https://deepgram.com/product/speech-to-text/japanese) -- Japanese language support confirmation
- [Deepgram Nova-3 Language Expansion](https://deepgram.com/learn/deepgram-expands-nova-3-with-11-new-languages-across-europe-and-asia) -- Nova-3 Japanese streaming with code-switching
- [Mangomint Med Spa Features 2026](https://www.mangomint.com/blog/medical-spa-software-features/) -- Wellness software feature expectations
- [Real-Time AI Medical Scribe 2025 (DoraScribe)](https://dorascribe.ai/ai-medical-scribe-real-time/) -- Real-time scribe workflow and UX patterns
- [NLP for Medical Information Extraction](https://pmc.ncbi.nlm.nih.gov/articles/PMC10031450/) -- Auto-tagging feasibility and accuracy expectations
- [AMTA Massage Therapy Forms](https://www.amtamassage.org/resources/forms-templates/) -- Industry-standard documentation templates for wellness
