<?php
/*
    OmnomIRC COPYRIGHT 2010,2011 Netham45
                       2012-2016 Sorunome

    This file is part of OmnomIRC.

    OmnomIRC is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    OmnomIRC is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with OmnomIRC.  If not, see <http://www.gnu.org/licenses/>.
*/
namespace oirc;
error_reporting(E_ALL);
ini_set('display_errors','1');

$textmode = true; // else omnomirc.php will set json headers
include_once(realpath(dirname(__FILE__)).'/omnomirc.php');
if(!OIRC::$config['info']['installed']){
	if(file_exists(realpath(dirname(__FILE__)).'/updater.php')){
		header('Location: updater.php');
		die();
	}else{
		die('OmnomIRC not installed');
	}
}

include_once(realpath(dirname(__FILE__)).'/skins.php');

if(strpos($_SERVER['HTTP_USER_AGENT'],'textmode;')!==false || isset($_GET['textmode'])){
	header('Location: '.OIRC::getCheckLoginUrl().'&textmode&network='.(OIRC::$you->getNetwork()));
	exit;
}

$page = getSkin('lobster');

parseScripts($page,'js',function(&$page,$file){
	$page['head'] .= '<script type="text/javascript" src="'.htmlentities($file).'"></script>';
},function(&$page,$file){
	$page['head'] .= '<script type="text/javascript">'.$file.'</script>';
});
parseScripts($page,'css',function(&$page,$file){
	$page['head'] .= '<link rel="stylesheet" type="text/css" href="'.htmlentities($file).'" />';
},function(&$page,$file){
	$page['head'] .= '<style type="text/css">'.$file.'</style>';
});

// now it's time to construct the page!

$theme = OIRC::$networks->get(OIRC::$you->getNetwork());
$theme = $theme['config']['theme'];
echo '<!DOCTYPE html><html><head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta charset="utf-8" />
	<title>'.$page['title'].'</title>
	<link rel="icon" type="image/png" href="'.htmlentities($page['favicon']).'">
	'.$page['head'].'
	'.($theme!=-1?'<link rel="stylesheet" type="text/css" href="theme.php?theme='.$theme.'" />':'').'
</head>
<body>'.$page['html'].'</body></html>';
