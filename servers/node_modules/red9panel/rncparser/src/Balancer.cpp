#include "Balancer.hpp"

Balancer::Balancer(RNCState *state_, int64_t periodUs_) {
    periodUs = periodUs_;
    for(int index = 0; index < state_->sensorsSize(); index++){
        Sensor * s = state_->getSensor(index);
        estimators.push_back(new SensorEstimator(s, s->allowEmptyValues()));
    }
    primed = false;
}

Balancer::~Balancer() {
    for (auto e : estimators) {
        delete e;
    }
}

int64_t Balancer::alignTimestamp(int64_t timestamp) {
    const int64_t microsecondsInSecond = 1000000;
    return timestamp +
            (microsecondsInSecond -
                    (timestamp % microsecondsInSecond)
            )
            - periodUs; // This makes sure that we start right on the second boundary, not 1 periodUs after.
}

void Balancer::process(StreamItem *item) {
    Element *element = (Element *) item;
    // No matter what, we want to distribute the new element to all of our estimators. Let them
    // decide if they want it or not.
    for (auto e : estimators) {
        // Older stream elements may be discared out of the end of the estimators.
        // We need to make sure that we send those on down the chain.
        StreamItem *poppedOff = e->newElement(element);
        if (poppedOff != NULL) {
            RNCStreamProcessor::callNext(poppedOff);
        }
    }
    if (primed) {
        //std::cout << element->getTimestamp() << " > " << (lastCrossSection + periodUs) << " == " << (element->getTimestamp() > lastCrossSection + periodUs) << std::endl;
        while (element->getTimestamp() > lastCrossSection + periodUs) {
            lastCrossSection += periodUs;
            CrossSection *cs = new CrossSection(lastCrossSection);

            for (auto e : estimators) {
                e->getEstimate(lastCrossSection, cs);
            }

            CSStreamProcessor::callNext(cs);
        }

    } else {
        lastCrossSection = alignTimestamp(element->getTimestamp());

        // Calculate if we're primed and ready
        primed = true;
        for (auto e : estimators) {
            primed = primed && e->isReady();
        }
    }
}


void Balancer::process(CrossSection *item) {
    // Do nothing, since this is the class that generates the CrossSections.
}