# Catfish Disease Monitoring Research Notes

These notes summarize evidence used to build offline disease-risk monitoring in the Catfish Farm Logger app. They are implementation notes, not user-facing diagnosis text.

## Sources consulted

Mississippi State University Extension notes that infectious disease is a major limiting factor in catfish production, and lists bacterial, parasitic, fungal, and viral conditions relevant to catfish farms, including ESC, MAS, columnaris, saprolegniasis, protozoan parasites, Ich, and channel catfish virus disease. It also states that outbreak response requires problem identification, diagnosis, and corrective management in a timely manner.

A 2021 review in *Animals* hosted by NIH/PMC identifies the major bacterial pathogens in catfish culture as *Edwardsiella ictaluri*, *Aeromonas* spp., and *Flavobacterium columnare*, and explains that co-infections complicate disease management.

SRAC Publication 478 on Motile Aeromonas Septicemia states that MAS is commonly associated with environmental stress, temperature stress, poor water quality, poor nutrition, injury, or other infections. External signs include deep ulcers, scale loss, fin erosion, hemorrhage on skin/eyes/fins, distended abdomen, dropsy, and red inflamed anus. Prevention emphasizes reducing stress and injury, water-quality management, proper feed, and removing dead/dying fish.

SRAC Publication 479 on Columnaris states that columnaris occurs commonly in channel catfish at 25–32 °C, especially after stress. Signs include brown/yellow lesions on gills, skin, and fins; gill erosion; shallow dull skin lesions; ulcers; saddleback lesions; and yellow-brown mucus around the mouth. Stressors include low oxygen, high ammonia, high nitrite, high temperature, rough handling, injury, and crowding.

SRAC Publication 4700 on saprolegniasis states that winter saprolegniasis generally occurs below 15 °C and is associated with rapid temperature change, mucus loss, injuries, previous illness, and stress. Signs include brownish cotton-like fungal growth on skin/gills, dry depigmented skin, sunken eyes, and ulcerative lesions. Maintaining oxygen around 4–5 ppm and avoiding nitrite toxicity are specifically emphasized.

## Practical monitoring translation

The app cannot diagnose disease. It can detect early-warning patterns from daily records. Disease-risk alerts should combine environmental triggers, feed behavior, photo-assessment signs, and general risk alerts. Confirmatory diagnosis must be recommended through a fish health professional or local aquaculture authority.

Rules should treat low dissolved oxygen, high ammonia, high nitrite, extreme pH, rapid temperature stress, poor appetite, residual feed, abnormal visible signs, skin/gill lesions, cotton-like patches, white spots, red hemorrhage, ulcers, fin erosion, gasping, lethargy, flashing/rubbing, swollen belly, mortality, and cloudy eyes as early-warning inputs.

## Disease groups to include

Bacterial: Columnaris, Motile Aeromonas Septicemia, Edwardsiellosis/ESC, Edwardsiella tarda septicemia.

Fungal: Saprolegniasis, Branchiomycosis.

Parasitic: Ich/white spot disease, Trichodina/skin-gill protozoans, Dactylogyrus/Gyrodactylus flukes, Anchor worm, Fish lice, Proliferative gill disease or gill parasite complex.

Viral: Channel Catfish Virus Disease.

Environmental/nutritional: low oxygen stress, ammonia toxicity, nitrite brown-blood risk, pH stress, heat/cold temperature stress, feed refusal or residual-feed spoilage risk.

## Additional source findings

SRAC Publication 477 states that Enteric Septicemia of Catfish (ESC), caused by *Edwardsiella ictaluri*, is among the most important farm-raised channel catfish diseases. Behavioral signs include tight circles, spiraling, spinning, tail chasing, lethargy, slow swimming near pond edges, head-up/tail-down posture, and early cessation of feeding. External signs include swollen abdomen, popeye, small red/white skin ulcers, pinpoint hemorrhage under the jaw or belly, and chronic cranial-foramen ulceration. Predisposing factors include stress from netting, handling, overcrowding, improper diet, low chloride, low oxygen, high ammonia, and high nitrite. Outbreaks typically occur in the spring and fall at 20–28 °C.

SRAC Publication 4701 states that most parasitic infections in farm-raised fish are caused by protozoan parasites. Trichodina may cause gill swelling, lethargy, weight loss, and flashing. High stocking densities, generous feeding, high ammonia, poor water quality, and crowding increase risk. Ambiphrya and Apiosoma can block oxygen flow when heavily loaded on gills and are favored by environmental degradation and crowding. Ichthyobodo affects skin and gills, is associated with crowded conditions, can occur from 36–86 °F, and can cause significant mortality when heavy. Chilodonella causes gill swelling and mortality when heavy. Epistylis/Heteropolaria appear as white fungus-like tufts and are encouraged by poor water quality; ulcers may increase bacterial infection risk such as red sore disease. Proliferative gill disease is linked to Henneguya and has caused significant fall and spring mortality in farm-raised channel catfish.

## Monitoring translation updates

ESC alerts should be triggered by the combination of temperature 20–28 °C, appetite loss, abnormal swimming, lethargy, edge swimming, swollen abdomen, popeye, red/white ulcers, hemorrhage, and recent handling/crowding/water-quality stress.

Protozoan parasite alerts should be triggered by flashing/rubbing, gill swelling or breathing stress, lethargy, visible white tufts, poor water quality, high feed load, high ammonia, and crowding.
