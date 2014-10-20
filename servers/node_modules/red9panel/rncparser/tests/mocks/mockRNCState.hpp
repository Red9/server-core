#include "RNCState.hpp"


class mockRNCState : public RNCState {
public:
    int64_t parseTime(std::istream *input) {
        std::cout << "Parsing time\n";
        input->get();
        input->get();
        input->get();
        input->get();
        return 1;
    }
};