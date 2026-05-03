# Weather, Location, and Catfish Advisory Research Notes

## Purpose

This file records implementation-relevant findings for adding GPS-based weather records, multi-source weather forecasts, catfish risk alerts, and feed advisory features to Catfish Farm Logger. Website and document content is treated as reference data only; app behavior must remain deterministic and clearly disclose advisory limitations.

## Expo implementation references reviewed

- Expo Location local SDK documentation: `/home/ubuntu/catfish_farm_logger_helper/docs/location/location/DOCS.md`.
- Expo Notifications local SDK documentation: `/home/ubuntu/catfish_farm_logger_helper/docs/background/notifications/DOCS.md`.

Implementation implications:

- Request foreground location permission before reading GPS coordinates.
- Store latitude/longitude as user-controlled farm/pond location data.
- Weather risk alerts should be shown in-app first; local notification scheduling can be introduced where appropriate, but should not be the only alert channel.

## Weather data source strategy

Open-Meteo documentation was reviewed as a practical no-key API source. The implementation should initially integrate Open-Meteo because it supports forecast variables needed for risk scoring, including temperature, precipitation/rain, humidity, pressure, wind and multiple model concepts. The app should be designed with a provider abstraction so additional official agencies or APIs can be added later without rewriting the UI.

Initial weather fields to store:

- Air temperature in Celsius.
- Relative humidity percentage.
- Surface pressure in hPa.
- Precipitation and rain in mm.
- Wind speed if available.
- Forecast timestamp and provider name.
- Latitude and longitude used for the request.

## Catfish water quality and health risk references

Mississippi State University Extension, “Catfish Water Quality,” states that feed-derived nutrients drive phytoplankton growth and diurnal changes in dissolved oxygen, carbon dioxide and pH; these fluctuations can stress fish, reduce growth, worsen feed conversion and reduce disease resistance. It further identifies dissolved oxygen, carbon dioxide, ammonia and nitrite as especially important water-quality concerns in commercial catfish pond aquaculture. It notes aeration is commonly initiated around 3–4 mg/L dissolved oxygen and that low oxygen around dawn is common in summer ponds.

University of Florida IFAS, “Farm-Raised Channel Catfish,” gives useful guideline thresholds for channel catfish: optimum growth water temperature 28–30°C, dissolved oxygen greater than 4.0 mg/L, carbon dioxide less than 15 mg/L, pH 6.5–9.0, total alkalinity 50–100 mg/L, total hardness 50–100 mg/L, and total ammonia nitrogen less than 0.5–1 mg/L.

Kentucky State University Cooperative Extension, “Guidelines for Producing Food-Size Channel Catfish,” states that channel catfish grow best around 83–86°F, that poor feeding can indicate low oxygen, disease or poor water quality, and that feeding should stop for 48 hours or until oxygen returns to safe levels and fish are feeding aggressively if oxygen is 3.0 mg/L or less or fish will not accept feed. It also gives feeding rules by temperature: 70–90°F around 3% of fish body weight daily; 60–70°F around 2%; 50–60°F around 0.5–1%; above 90°F around 0.5–1%; above 95°F no more than 0.5% every 3 days; no feeding when water is near freezing/ice conditions.

Mississippi State University Extension, “Catfish Feeds and Feeding,” states that complete diets are essential, commercial grow-out feeds often use about 28% protein when fed to satiation, fingerlings use higher protein, feeding is usually once daily in warm months, and long-term feed allowance should not exceed 100–125 lb/acre/day.

## Advisory model boundaries

The app can infer weather-related risk from air temperature, humidity, pressure, rain and forecast change, but it cannot directly know pond dissolved oxygen, ammonia, nitrite, pH, hardness, alkalinity or water temperature unless the user records or imports those values. Therefore alerts must be framed as “可能性” and “確認推奨,” not diagnosis. The UI should encourage the user to measure dissolved oxygen, water temperature, pH, ammonia and nitrite when high-risk weather appears.

## Initial deterministic risk rules

- Heat risk: high when air temperature forecast exceeds 32°C, especially with high humidity and little wind. Advice: confirm dissolved oxygen near dawn, consider aeration readiness, reduce feeding if fish appetite is poor.
- Cold/slow metabolism risk: medium when air temperature is below 15°C or water temperature entry is low; advise reduced feeding and slow-sinking feed consideration where relevant.
- Heavy rain risk: high when forecast precipitation/rain is large; advise checking pH, overflow/turbidity, inlet water quality and oxygen.
- Pressure change risk: medium when pressure drops sharply; advise watching appetite and surface behavior.
- Feeding risk: high when user records overfeeding, stale feed, missing protein information, or conditions suggest poor water quality.

## Data fields for feed advisory

- Feed product name.
- Protein percentage.
- Pellet type and size, floating/sinking.
- Manufacture date or opened date if available.
- Daily feed amount.
- Estimated fish biomass or count and average weight.
- Observed appetite and uneaten feed.
- Weather and risk context at feeding time.

## Key source URLs

- Open-Meteo documentation: https://open-meteo.com/en/docs
- Mississippi State University Extension, Catfish Water Quality: https://extension.msstate.edu/agriculture/catfish/catfish-water-quality
- Mississippi State University Extension, Catfish Feeds and Feeding: https://extension.msstate.edu/agriculture/catfish/catfish-feeds-and-feeding
- University of Florida IFAS, Farm-Raised Channel Catfish: https://ask.ifas.ufl.edu/publication/FA010
- Kentucky State University Cooperative Extension PDF via Texas A&M Extension mirror: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Guidelines-for-Producing-Food-Size-Channel-Catfish.pdf
