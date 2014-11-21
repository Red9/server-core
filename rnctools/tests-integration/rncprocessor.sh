#!/bin/bash

command="./build/rncprocessor"
#TMPDIR=`mktemp`

testdir="../test-data"
testfile_a="$testdir/data_a.RNC"
testfile_b="$testdir/data_b.RNC"
testfile_c="$testdir/data_c.RNC"
testfile_d="$testdir/data_d.RNC"
testfile_e="$testdir/data_e.RNC"
testfile_f="$testdir/data_f.RNC"
testfile_g="$testdir/data_g.RNC"
testfile_h="$testdir/data_h.RNC"

csvHeaderRow="row,time,acceleration:x,acceleration:y,acceleration:z,gps:altitude,gps:hdop,gps:heading,gps:latitude,gps:longitude,gps:satellites,gps:speed,magneticfield:x,magneticfield:y,magneticfield:z,pressure:pressure,pressure:temperature,rotationrate:x,rotationrate:y,rotationrate:z"

@test "first test" {
    run $command --help
    [ "$status" -eq 1 ]
}

@test "Requires an input filename" {
    run $command
    [ "$status" -eq 1 ]
}

@test "Requires a cross section period" {
    run $command --inputFile $testfile_a
    [ "$status" -eq 1 ]
}

@test "Requires an output type" {
    run $command --inputFile $testfile_a --csPeriod 10
    [ "$status" -eq 1 ]
}


@test "basic startTime and endTime" {
    run $command --inputFile $testfile_f --csPeriod 1000 --csvOutput --startTime 1400729108000 --endTime 1400729125000
    [ "$status" -eq 0 ]

    echo ${lines[1]}
    echo ${lines[17]}
    [ "${lines[0]}" = "$csvHeaderRow" ]
    [ "${lines[1]}" = "0,1400729108000,-9.25434,0.602896,3.26771,142.8,2.09,53.16,33.0536,-117.276,4,0.198,3.63055e-05,-6.46909e-06,-3.01756e-05,100656,20.6774,-0.00779464,-0.00193033,0.0099571" ]
    [ "${lines[17]}" = "16,1400729124000,-9.2559,0.595056,3.27947,143.9,2.09,256.199,33.0536,-117.276,4,0.582,3.64145e-05,-6.42909e-06,-3.01633e-05,100653,21.2677,0.00222355,-0.000207694,-0.00045204" ]
    [ "${#lines[@]}" -eq 18 ]
}

@test "startTime and endTime parameter checking" {
    run $command --inputFile $testfile_f --csPeriod 1000 --csvOutput --startTime 1400729108000
    [ "$status" -eq 1 ]

    run $command --inputFile $testfile_f --csPeriod 1000 --csvOutput --endTime 1400729125000
    [ "$status" -eq 1 ]

    run $command --inputFile $testfile_f --csPeriod 1000 --csvOutput --startTime 999999999 --endTime 123456789
    [ "$status" -eq 1 ]
}


################################################################################
# --rows
################################################################################
@test "basic rows" {
    run $command --inputFile $testfile_f --csvOutput --startTime 1400729108000 --endTime 1400729125000 --rows 10
    [ "$status" -eq 0 ]
    echo ${lines[1]}
    echo ${lines[10]}
    [ "${lines[0]}" = "$csvHeaderRow" ]
    [ "${lines[1]}" = "0,1400729108600,-9.2429,0.599068,3.27205,142.8,2.09,53.16,33.0536,-117.276,4,0.219412,3.6368e-05,-6.4632e-06,-3.0192e-05,100656,20.6873,-0.00145036,-0.00109313,0.00644445" ]
    [ "${lines[10]}" = "9,1400729123900,-9.24843,0.591228,3.2845,143.9,2.09,256.451,33.0536,-117.276,4,0.605882,3.61142e-05,-6.33615e-06,-2.98695e-05,100653,21.2511,-0.000445572,-0.00164574,-0.000100613" ]
    [ "${#lines[@]}" -eq 11 ]
}

@test "rows on big file" {
    run $command --inputFile $testfile_e --csvOutput --startTime 1414368000113 --endTime 1414371199859 --rows 1000
    [ "$status" -eq 0 ]
    echo ${lines[1]}
    echo ${lines[1000]}
    [ "${lines[0]}" = "$csvHeaderRow" ]
    [ "${lines[1]}" = "0,1414368001000,2.0326,-3.0944,8.01353,28.7111,1.22,196.094,33.8996,-118.421,6,6.37444,-6.11542e-05,1.74783e-05,-2.26575e-05,98362,17.2357,-1.13419,-0.32513,0.69469" ]
    [ "${lines[1000]}" = "999,1414371197546,-1.52929,-2.86748,9.09832,19.0156,1.03,34.4581,33.8996,-118.421,9,1.45531,-1.49557e-05,-7.36591e-06,-4.36136e-05,103004,17.618,-0.053863,0.0443412,-0.0686574" ]
    [ "${#lines[@]}" -eq 1001 ]
}


################################################################################
# CSV Tests
################################################################################

@test "Basic CSV works correctly" {
    run $command --inputFile $testfile_a --csPeriod 10 --csvOutput
    [ "$status" -eq 0 ]
    echo ${lines[1]}
    echo ${lines[2274]}
    [ "${lines[0]}" = "$csvHeaderRow" ]
    [ "${lines[1]}" = "0,1401326588000,0.132453,0.179003,10.1015,nan,nan,nan,nan,nan,0,nan,-3.47273e-06,1.51818e-06,-4.2194e-05,95962.9,20.6337,-0.015449,0.00669981,0.08225" ]
    [ "${lines[2274]}" = "2273,1401326610730,0.0795241,0.0795241,10.2312,nan,nan,nan,nan,nan,0,nan,-5.46216e-06,1e-06,-4.74047e-05,102338,16.73,-0.0211687,0.0137908,-0.0304957" ]
    [ "${#lines[@]}" -eq 2275 ]
}

@test "Basic CSV works correctly, with GPS" {
    run $command --inputFile $testfile_f --csPeriod 1000 --csvOutput
    [ "$status" -eq 0 ]
    echo ${lines[1]}
    echo ${lines[58]}
    [ "${lines[0]}" = "$csvHeaderRow" ]
    [ "${lines[1]}" = "0,1400729078000,-7.7797,0.951231,5.81434,113.812,1.66,85.2575,33.0535,-117.277,5,0.89125,-4.17992e-05,1.9947e-05,-5.23343e-05,98268.2,18.7374,-0.0406662,0.00935765,0.0321141" ]
    [ "${lines[58]}" = "57,1400729135000,-9.58205,0.612304,0.902384,143.97,2.09,328.356,33.0536,-117.276,4,1.037,5.24582e-05,-9.17091e-06,-2.91715e-05,100652,21.6252,0.00193033,-0.00497244,-0.00205251" ]
    [ "${#lines[@]}" -eq 59 ]
}

################################################################################
# JSON Tests
################################################################################

@test "jsonProperties" {
    run $command --inputFile $testfile_a --csPeriod 1000 --jsonProperties
    [ "$status" -eq 0 ]
    echo $output
    correct='{"startTime":1401326587378,"endTime":1401326610732,"gpsLock":{"percentOn":0,"validTime":0,"invalidTime":23300}}'
    echo "process.exit(require('underscore')._.isEqual($output, $correct)? 0 : 1);" | node
    [ "$?" -eq 0 ]
}

@test "jsonPanel no gps" {
    run $command --inputFile $testfile_a --csPeriod 10000 --jsonPanel
    [ "$status" -eq 0 ]
    echo $output
    correct='{"panel":{"time":[1401326588000,1401326598000,1401326608000],"acceleration:x":[0.13245312657090836,0.22068833707456884,0.21897120259702206],"acceleration:y":[0.17900312712299638,0.12751234136396218,0.13257440157234669],"acceleration:z":[10.101503244804917,10.363153191013306,10.298937722146512],"gps:altitude":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:hdop":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:heading":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:latitude":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:longitude":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:satellites":[0.0,0.0,0.0],"gps:speed":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"magneticfield:x":[-0.000003472727510711593,-0.000004932646639099218,-0.000005224727630775305],"magneticfield:y":[0.0000015181819222220838,0.0000010559441283073914,9.480000649659815e-7],"magneticfield:z":[-0.00004219395335525178,-0.000046518715318148286,-0.00004667273691188711],"pressure:pressure":[95962.9375,102355.99792960663,102355.24693877551],"pressure:temperature":[20.633749538799749,22.103187911752344,22.34763215355271],"rotationrate:x":[-0.0154489791020751,-0.02692624822570175,-0.019944750252761879],"rotationrate:y":[0.006699812365695834,0.009686136272777329,0.01234192141215317],"rotationrate:z":[0.08225004945416004,-0.036438204519590979,-0.018117041439400056]}}'
    echo "process.exit(require('underscore')._.isEqual($output, $correct)? 0 : 1);" | node
    [ "$?" -eq 0 ]
}

@test "jsonPanel with gps" {
    run $command --inputFile $testfile_f --csPeriod 10000 --jsonPanel
    [ "$status" -eq 0 ]
    echo $output
    correct='{"panel":{"time":[1400729078000,1400729088000,1400729098000,1400729108000,1400729118000,1400729128000],"acceleration:x":[-7.779704871679903,-8.388251299485564,-9.305766510367393,-9.257393709793688,-9.24626090966165,-9.247593709677459],"acceleration:y":[0.9512305259875789,0.780080009251833,0.32692800387740136,0.6016416071355343,0.5945072070509195,0.6009360071271658],"acceleration:z":[5.8143364660174809,4.583812854364514,1.7723888210207224,3.222240038216114,3.280648038908839,3.288252838999033],"pressure:pressure":[98268.19047619048,100662.80410022779,100659.09403669725,100657.44827586207,100655.24827586208,100653.54942528736],"pressure:temperature":[18.73738053356785,19.326377700140239,20.03456377237608,20.49970069122126,20.885378843520223,21.248022513575426],"gps:altitude":[113.8125,135.36000000000005,143.15999999999989,142.8539999999997,143.0580000000001,143.91299999999988],"gps:hdop":[1.66,1.6599999999999975,1.6642999999999973,2.077100000000003,2.090000000000003,2.090000000000003],"gps:heading":[85.2575,62.391799999999978,53.159999999999929,53.159999999999929,165.47889999999996,258.00299999999955],"gps:latitude":[33.053513333333338,33.0535792333333,33.053574949999987,33.053569416666679,33.053563116666669,33.053554299999998],"gps:longitude":[-117.27663625,-117.27642801666673,-117.27637438333332,-117.27637043333356,-117.27639603333339,-117.27645081666663],"gps:satellites":[5.0,5.0,4.99,4.03,4.0,4.0],"gps:speed":[0.89125,0.6111,0.4885999999999992,0.2574000000000002,0.5888000000000002,0.5811000000000002],"rotationrate:x":[-0.04066617203144623,-0.02991407105291728,0.014671761456993409,-0.003909537568688393,-0.0007379252160899341,-0.0013988814112963155],"rotationrate:y":[0.009357650018460885,0.04242825646419078,0.021591642953571866,-0.026357613595901057,-0.005183802469982766,-0.0023860396473901347],"rotationrate:z":[0.03211405859994037,0.011586891969200224,-0.014096326396102087,0.0034110715286806228,0.0018277088133618236,0.0013634512270800769],"magneticfield:x":[-0.000041799245288724286,-0.000021874183317208917,0.000019254183137661583,0.00003663491160148169,0.00003638691158448637,0.00003637927522032669],"magneticfield:y":[0.000019946971063925883,0.00001565200107262399,0.000006684000458051287,-0.000006508727718767204,-0.000006424727713010725,-0.0000064021822569202418],"magneticfield:z":[-0.00005233427769546495,-0.00004864702617311423,-0.0000337980199040544,-0.000030046992756922462,-0.000030135972508617214,-0.000030078421384814648]}}'
    echo "process.exit(require('underscore')._.isEqual($output, $correct)? 0 : 1);" | node
    [ "$?" -eq 0 ]

}

@test "all the statistics we have, with gps" {
    run $command --inputFile $testfile_f --jsonProperties --jsonStatistics
    [ "$status" -eq 0 ]
    echo $output
    correct='{"summaryStatistics":{"distance":{"path":58.520853030227417,"greatCircle":15.979716285270185},"speed":{"path":{"minimum":1.5334263417126855,"maximum":2.272405683916397,"average":1.923487753330028,"count":213}},"gps":{"latitude":{"minimum":33.05350833333333,"maximum":33.05361166666667,"average":33.053567772988518,"count":580},"longitude":{"minimum":-117.27663833333334,"maximum":-117.27636833333334,"average":-117.27641526436793,"count":580},"satellites":{"minimum":4.0,"maximum":5.0,"average":4.362068965517241,"count":580},"hdop":{"minimum":1.66,"maximum":2.09,"average":1.9343103448275916,"count":580},"altitude":{"minimum":113.3,"maximum":144.1,"average":141.57655172413886,"count":580},"speed":{"minimum":0.1,"maximum":1.06,"average":0.5205862068965513,"count":580},"heading":{"minimum":46.12,"maximum":336.37,"average":139.65062068965509,"count":580}},"acceleration":{"x":{"minimum":-64.09200076013804,"maximum":29.988000355660917,"average":-9.111782435652929,"count":8700},"y":{"minimum":-60.32880071550608,"maximum":93.9624011144042,"average":0.5894336794045401,"count":8700},"z":{"minimum":-100.43040119111538,"maximum":59.85840070992708,"average":3.1162251576484216,"count":8700}},"rotationrate":{"x":{"minimum":-8.238128695520573,"maximum":12.908804359612987,"average":-0.005384039884465265,"count":5800},"y":{"minimum":-5.855754239601083,"maximum":4.302934786537662,"average":0.00998406582331317,"count":5800},"z":{"minimum":-25.264164807158524,"maximum":2.5754078733734788,"average":0.0018721966546606916,"count":5800}},"magneticfield":{"x":{"minimum":-0.00004545454856952347,"maximum":0.00005418182189487197,"average":0.000023260260976258546,"count":1451},"y":{"minimum":-0.00001154545533665896,"maximum":0.00003609091156420163,"average":-7.499530618569206e-8,"count":1451},"z":{"minimum":-0.00005765316480221827,"maximum":1.0204099964994384e-7,"average":-0.00003427002317120154,"count":1451}}},"startTime":1400729077081,"endTime":1400729135082,"gpsLock":{"percentOn":100,"validTime":57907,"invalidTime":0},"boundingCircle":{"latitude":33.053567772988518,"longitdue":-117.27641526436793},"boundingBox":{"west":-117.27663833333334,"east":-117.27636833333334,"north":33.05361166666667,"south":33.05350833333333}}'
    echo "process.exit(require('underscore')._.isEqual($output, $correct)? 0 : 1);" | node
    [ "$?" -eq 0 ]
}

#This one should be last, since it's going to take a while to process.
@test "The largest file possible" {
    run $command --inputFile $testfile_d --jsonProperties --jsonStatistics --jsonPanel --startTime 97 --endTime 30248507 --rows 10
    [ "$status" -eq 0 ]
    echo $output
    correct='{"summaryStatistics":{"distance":{"path":2.696539702293474e308,"greatCircle":5208.357584242396},"speed":{"path":{"minimum":0.005753746710193868,"maximum":810.2457759860781,"average":2.696539702293474e308,"count":148718}},"gps":{"latitude":{"minimum":42.349158333333338,"maximum":42.64597666666667,"average":2.696539702293474e308,"count":302494},"longitude":{"minimum":-71.35315666666667,"maximum":-71.06399,"average":2.696539702293474e308,"count":302494},"satellites":{"minimum":0.0,"maximum":11.0,"average":8.948365918001679,"count":302494},"hdop":{"minimum":0.75,"maximum":6.9,"average":2.696539702293474e308,"count":302494},"altitude":{"minimum":-89.0,"maximum":123.0,"average":2.696539702293474e308,"count":302494},"speed":{"minimum":0.0,"maximum":17.98,"average":2.696539702293474e308,"count":302494},"heading":{"minimum":0.0,"maximum":360.0,"average":2.696539702293474e308,"count":302494}},"acceleration":{"x":{"minimum":-33.16320039331913,"maximum":100.43040119111538,"average":8.738528072302483,"count":4537262},"y":{"minimum":-62.7984007447958,"maximum":76.91040091216564,"average":-0.9255666734821528,"count":4537262},"z":{"minimum":-49.862400591373447,"maximum":115.71840137243271,"average":2.3539101092287795,"count":4537262}},"rotationrate":{"x":{"minimum":-7.793418797082268,"maximum":8.048760469537229,"average":-0.06043283547618931,"count":3024842},"y":{"minimum":-7.22164892766159,"maximum":7.627263450413011,"average":0.01606737424822865,"count":3024842},"z":{"minimum":-3.7995818245690318,"maximum":5.263214951846749,"average":0.01799104838767377,"count":3024842}},"magneticfield":{"x":{"minimum":-0.0001127272804524182,"maximum":0.0001470000100738389,"average":-0.000005771715504868009,"count":756211},"y":{"minimum":-0.000053272730923481504,"maximum":0.00010009091595009068,"average":0.000012830662138925037,"count":756211},"z":{"minimum":-0.00014795944949241857,"maximum":0.0000844899477101535,"average":-0.000032058731075141394,"count":756211}}},"startTime":97,"endTime":30248504,"gpsLock":{"percentOn":98,"validTime":29836337,"invalidTime":411908},"boundingCircle":{"latitude":42.521847621950588,"longitdue":-71.20263763462323},"boundingBox":{"west":-71.35315666666667,"east":-71.06399,"north":42.64597666666667,"south":42.349158333333338},"panel":{"time":[1000,3025841,6050682,9075523,12100364,15125205,18150046,21174887,24199728,27224569],"acceleration:x":[9.067360034010456,7.9262775724847069,8.117177022483935,8.484157945666072,8.720314129761406,8.853857403339079,8.895241224497389,8.775452552471779,9.246194166867192,9.088506707809183],"acceleration:y":[-2.011251862088958,-1.9775669585647747,-1.5513217867749816,-1.6282556149791572,-1.9413205286168654,0.271025824468145,0.04433206980973581,-0.9397293085626749,-0.7691667220725067,-0.24843021677590094],"acceleration:z":[2.9858834912952529,3.554401115931383,4.261156779584099,3.593019240984418,2.3731189120508957,2.400845315618316,1.8956533840855557,0.801467675894459,0.6687588712102711,2.0986680615469139],"gps:altitude":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:hdop":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:heading":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:latitude":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:longitude":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"gps:satellites":[0.0,8.245505023796932,10.12793811365665,8.747628020761017,9.803365400509108,9.956459931235124,9.467519587424377,9.227114945948627,8.015174055340673,8.028530811954509],"gps:speed":[2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308,2.696539702293474e308],"magneticfield:x":[0.000021204546907682698,0.00001904787223895683,0.000011247789413360231,0.000010514843278740932,0.0000037573728487985358,-0.00001718074462166939,-0.000016894265737940937,-0.000017062711022622826,-0.000014958932586947992,-0.000017210160454545114],"magneticfield:y":[7.765152047293592e-7,0.00002548979280736904,0.000009922310445527528,0.000019780685172345595,0.00002376297030840094,0.000008434799233047934,0.000005352246195566942,0.000012403966318985171,0.0000093776278289357,0.000007074806545198664],"magneticfield:z":[-0.00004575263321804357,-0.000041000603970281876,-0.00004162551419998568,-0.00004100370644361712,-0.000030395827945024246,-0.00003704121346952202,-0.000027175829279367032,-0.000024876111673299873,-0.000019164200036489873,-0.00003199328687200994],"pressure:pressure":[99624.09090909091,101894.19777198855,101870.20244600976,101762.94388647302,101500.6500543047,101522.79781270105,101452.11709720108,101430.29227162677,101430.9339397944,101479.42235183757],"pressure:temperature":[21.3252267960713,19.390353534148578,16.055801328561974,15.803998934888158,16.06218153479152,18.370241141946484,20.155145768010486,17.59627776664027,19.83817579396254,21.299164639748207],"rotationrate:x":[-0.05402465376511707,-0.05109864157240291,-0.05760491209580676,-0.06157124799319225,-0.05936835342198598,-0.05783852999265124,-0.06297559930556912,-0.07031155826218894,-0.06494076100723599,-0.062099902904034418],"rotationrate:y":[-0.040048593981447378,0.0047528875644885,0.019038814552801429,0.02120772167974205,0.022583511446111535,0.023022791599865395,0.01761199919475995,0.01736012528629546,0.014107335105316373,0.0132613635809453],"rotationrate:z":[-0.0016513500032578034,0.014820726655036386,0.01926413227701723,0.017800165398988885,0.022361702116258904,0.021053566407159147,0.020749449622667703,0.015933351322487484,0.017840070641062267,0.015524511240380073]}}'
    echo "process.exit(require('underscore')._.isEqual($output, $correct)? 0 : 1);" | node
    [ "$?" -eq 0 ]
}


