#include "../client/client.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#ifndef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif
#endif

static qboolean q3js_mobile_bindings_initialized = qfalse;

#ifdef __EMSCRIPTEN__
EM_JS( void, Q3JS_NotifyTextInputActive, ( int active ), {
	if( typeof window === "undefined" )
	{
		return;
	}

	window.dispatchEvent( new CustomEvent( "q3js:text-input-active-change", {
		detail: active !== 0
	} ) );
} );

EM_JS( void, Q3JS_NotifyServerHandoff, ( int slot ), {
	if( typeof Module["onServerHandoff"] === "function" )
	{
		Module["onServerHandoff"]( slot );
	}
} );

EM_JS( void, Q3JS_NotifyNormalExit, ( void ), {
	if( typeof Module["onNormalExit"] === "function" )
	{
		Module["onNormalExit"]();
	}
} );
#else
void Q3JS_NotifyTextInputActive( int active )
{
	(void)active;
}

void Q3JS_NotifyServerHandoff( int slot )
{
	(void)slot;
}

void Q3JS_NotifyNormalExit( void )
{
}
#endif

static void Q3JS_InitMobileBindings( void )
{
	if( q3js_mobile_bindings_initialized )
	{
		return;
	}

	q3js_mobile_bindings_initialized = qtrue;

	Key_SetBinding( K_JOY1, "+forward" );
	Key_SetBinding( K_JOY2, "+back" );
	Key_SetBinding( K_JOY3, "+moveleft" );
	Key_SetBinding( K_JOY4, "+moveright" );
	Key_SetBinding( K_JOY5, "+attack" );
	Key_SetBinding( K_JOY6, "+moveup" );
	Key_SetBinding( K_JOY7, "+movedown" );
	Key_SetBinding( K_JOY8, "weapnext" );
	Key_SetBinding( K_JOY9, "weapprev" );

	Cvar_Set( "cl_freelook", "1" );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileInitBindings( void )
{
	Q3JS_InitMobileBindings();
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileKeyEvent( int key, int down )
{
	Q3JS_InitMobileBindings();

	if( key < 0 || key >= MAX_KEYS )
	{
		return;
	}

	Com_QueueEvent( 0, SE_KEY, key, down ? qtrue : qfalse, 0, NULL );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileMouseMove( int dx, int dy )
{
	Q3JS_InitMobileBindings();

	if( dx == 0 && dy == 0 )
	{
		return;
	}

	Com_QueueEvent( 0, SE_MOUSE, dx, dy, 0, NULL );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_MobileJoystickAxis( int axis, int value )
{
	Q3JS_InitMobileBindings();

	if( axis < 0 || axis >= MAX_JOYSTICK_AXIS )
	{
		return;
	}

	Com_QueueEvent( 0, SE_JOYSTICK_AXIS, axis, value, 0, NULL );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_RequestQuit( void )
{
	Cbuf_ExecuteText( EXEC_APPEND, "quit\n" );
}

EMSCRIPTEN_KEEPALIVE int Q3JS_IsConnected( void )
{
	return clc.state == CA_ACTIVE ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE int Q3JS_IsDisconnected( void )
{
	return clc.state == CA_DISCONNECTED ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE void Q3JS_SetPortalInfo( int slot, int active, int map,
	int ping, int players, int capacity, int topScore, int bestMatch )
{
	char name[32];

	if( slot < 0 || slot >= Q3JS_MAX_PORTALS )
	{
		return;
	}

	Com_sprintf( name, sizeof( name ), "q3js_portal%i_active", slot );
	Cvar_SetValue( name, active ? 1 : 0 );
	Com_sprintf( name, sizeof( name ), "q3js_portal%i_map", slot );
	Cvar_SetValue( name, map >= -1 && map < 26 ? map : -1 );
	Com_sprintf( name, sizeof( name ), "q3js_portal%i_ping", slot );
	Cvar_SetValue( name, ping < 0 ? 0 : ping );
	Com_sprintf( name, sizeof( name ), "q3js_portal%i_players", slot );
	Cvar_SetValue( name, players < 0 ? 0 : players );
	Com_sprintf( name, sizeof( name ), "q3js_portal%i_capacity", slot );
	Cvar_SetValue( name, capacity < 0 ? 0 : capacity );
	Com_sprintf( name, sizeof( name ), "q3js_portal%i_score", slot );
	Cvar_SetValue( name, topScore );
	Com_sprintf( name, sizeof( name ), "q3js_portal%i_best", slot );
	Cvar_SetValue( name, bestMatch ? 1 : 0 );
}

EMSCRIPTEN_KEEPALIVE void Q3JS_Resize( int width, int height )
{
	if( width < 1 || height < 1 )
	{
		return;
	}

	if( Cvar_VariableIntegerValue( "r_mode" ) == -1 &&
		Cvar_VariableIntegerValue( "r_customwidth" ) == width &&
		Cvar_VariableIntegerValue( "r_customheight" ) == height &&
		cls.glconfig.vidWidth == width &&
		cls.glconfig.vidHeight == height )
	{
		return;
	}

	Cvar_SetValue( "r_customwidth", width );
	Cvar_SetValue( "r_customheight", height );
	Cvar_Set( "r_mode", "-1" );
	Cbuf_ExecuteText( EXEC_APPEND, "vid_restart\n" );
}
