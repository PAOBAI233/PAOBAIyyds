<?php

namespace Xpyun\model;
class SetVoiceTypeRequest extends RestRequest
{
    //*Required*: The serial number of the printer
    var $sn;

    //Voice type: 0 human voice (loud) 1 human voice (medium) 2 human voice (low) 3 Ticking  4 Mute sound
    var $voiceType;
}

?>