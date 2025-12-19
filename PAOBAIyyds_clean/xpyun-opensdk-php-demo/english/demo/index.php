<?php
/**
 * Xinye Cloud Open Platform SDK API Test Sample Main Entrance
 */
include_once dirname(__DIR__) . '/PrinterLib/Autoloader.php';
include_once __DIR__ . '/examples/XpsdkPrintApiDemo.php';
include_once __DIR__ . '/examples/XpsdkOtherApiDemo.php';
/**
 * *Required*: Xinye Cloud background registration account (ie email address or developer ID), after successful registration of the developer user,
 * log in to Xinye Cloud background and view the developer ID under [Personal Center -> Developer Information]
 * <p>
 * Currently [XXXXXXXXXXXXXXXX] is just an example, need to be modified before use
 */
define('USER_NAME', 'XXXXXXXXXXXXXXXX');
/**
 * *Required*: The developer key automatically generated after registering an account on the Xinye Cloud background.
 * After the developer user has successfully registered,log in to the Xinye Cloud background and view the developer key under [Personal Center -> Developer Information]
 * <p>
 * Currently [XXXXXXXXXXXXXXXX] is just an example, need to be modified before use
 */
define('USER_KEY', 'XXXXXXXXXXXXXXXX');
/**
 * *Required*: The printer number, you must add a printer or call the API interface to add a printer under [Print Management -> Printer Management] in the backstage of Xinye Cloud Management.
 * Pay attention to replace the printer number when testing the ticket machine and labeling machine
 * How to get the print number: There will be a QR code with PID at the bottom of the printer, and a string of characters after the PID is the printer number
 * <p>
 * Currently [XXXXXXXXXXXXXXXX] is just an example, need to be modified before use，This is just a test example, so the printer number is constant, and developers can make variable according to their actual needs
 */
define('OK_PRINTER_SN', 'XXXXXXXXXXXXXXXX');

// ###### Note: The following interface test sample calls can be run by removing the relevant code comments. The current default only runs the print interface sample of the small ticket printer ######
// [Developer ID] and [Developer key] configuration and printer number settings, please developers according to their actual [Developer ID] and [Developer key] in the above definition to modify, development can also be defined to Processing in a configuration file
//###### For sample printer management interface, please refer to [demo/examples/XpsdkOtherApiDemo.php] file content begin ##############

/**
 * Sample print management
 */
$otherApi = new XpsdkOtherApiDemo();
/**
 * Print test sample
 */
$printApi = new XpsdkPrintApiDemo();

//1.add printers in batch
//$otherApi->addPrintersTest();

//2.set voice type for printer
//$otherApi->setVoiceTypeTest();

//######### For the print interface sample, please refer to demo/examples/XpsdkPrintApiDemo.php file content. begin ######
//3.sample for receipt using font and alignment in nest,don't support voice broadcast
//$printApi->printFontAlign();

//3.sample for receipt using font and alignment in nest,support voice broadcast
//$printApi->printFontAlignVoiceSupport();

//3.complex alignment sample for note,don't support voice broadcast
$printApi->printComplexReceipt();

//3.complex alignment sample for note,don't support voice broadcast
//$printApi->printComplexReceiptVoiceSupport();

//4.comprehensive layout sample for label printing
//$printApi->printLabel();
//####### For the print interface sample end ################

//5.delete printer in batch
//$otherApi->delPrintersTest();

//6.modify information of your printer
//$otherApi->updPrinterTest();

//7.clear printer queue
//$otherApi->delPrinterQueueTest();

//8.check if the order is printed successfully
//$otherApi->queryOrderStateTest();

//9.query order statistics for printer on a certain day
//$otherApi->queryOrderStatisTest();

//10.query status of printer
//$otherApi->queryPrinterStatusTest();

//11.cloud speaker play voice
//$otherApi->playVoiceTest();
?>

