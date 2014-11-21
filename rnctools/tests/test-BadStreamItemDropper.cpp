#include "catch.hpp"
#include "BadStreamItemDropper.hpp"

TEST_CASE("Bad items are dropped, good items are kept") {
    int kExpectedPass = 1;

    BadStreamItemDropper sut;

    class mockRNCStreamProcessor : public RNCStreamProcessor {
    public:
        int itemsPassed;

        mockRNCStreamProcessor() {
            itemsPassed = 0;
        }

        void process(StreamItem *item) {
            REQUIRE(item->isValid());
            itemsPassed++;
        }
    };


    mockRNCStreamProcessor next;

    sut.setNext(&next);

    StreamItem *itemValid = new StreamItem(0, true, NULL);
    StreamItem *itemInvalid = new StreamItem(1, false, NULL);

    sut.process(itemValid);
    sut.process(itemInvalid);

    REQUIRE(next.itemsPassed == kExpectedPass);
}

